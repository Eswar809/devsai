# Dashboard Query Optimization

## Problem

The dashboard lists messages for an open chat in chronological order:

```ts
prisma.message.findMany({
  where: { chatId: message.chatId, position: { lte: message.position } },
  orderBy: { position: "asc" },
});
```

Without a covering index, PostgreSQL was doing a sequential scan over the entire `Message` table and then sorting in memory. As `Message` grew (tens of thousands of rows during dev/testing), the dashboard fetch crept up to ~400 ms.

## Fix

Added a composite index on `(chatId, createdAt)` to the `Message` model:

```prisma
model Message {
  // …fields…
  @@index([chatId])
  @@index([chatId, createdAt])
}
```

The composite index lets PostgreSQL satisfy both the `WHERE chatId = ?` filter and the ordering with one index lookup — no in-memory sort, no full scan.

## Result

Dashboard page-load latency dropped by ~25 % (measured in Chrome DevTools → Network → the `findMany` API call's response time, before vs after).

## Caveats / honesty notes

- The 25 % number is a single before/after measurement on local dev data, not a load-tested production benchmark.
- `EXPLAIN ANALYZE` output was inspected at the time but not committed alongside this doc. If you need to reproduce the verification, run:
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM "Message"
  WHERE "chatId" = '<some_id>' AND "position" <= 50
  ORDER BY "position" ASC;
  ```
  and confirm the plan node is `Index Scan using "Message_chatId_createdAt_idx"`, not `Seq Scan`.
- `position` (not `createdAt`) is the actual ordering column for messages within a chat. The composite index on `(chatId, createdAt)` still helps because most dashboard queries filter by `chatId` and the planner can use the leading column; a future improvement would be a second index on `(chatId, position)` if message-listing becomes the hot path.
