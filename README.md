# DevsAI — Autonomous AI Code-Generation Platform

A full-stack Next.js app that turns a natural-language prompt into a multi-file React project, streamed back to the user in real time and rendered live inside a Sandpack iframe.

> **Status:** local development working. Production deployment runbook is in [`deployment.md`](./deployment.md) — replace this line with a live URL once deployed.

**Stack:** Next.js 16 · TypeScript · PostgreSQL (Prisma + Neon serverless adapter) · Gemini + Mistral via SSE streaming · Tailwind · Vercel

## What I built

- A multi-step code-generation flow that prompts an LLM (Gemini 2.5 or Mistral), parses the streamed response, and renders the running app in a Sandpack iframe (`lib/sandpack-config.ts`, `lib/stream-parser.ts`).
- Server-Sent Events streaming via a Next.js Route Handler (`app/api/get-next-completion-stream-promise/route.ts`) using `ReadableStream` — each request gets its own controller in a closure, so concurrent users don't share buffers or module-level state.
- Prisma schema for `Chat` / `Message` / `GeneratedApp` with composite indexes for the dashboard query path (`prisma/schema.prisma`).
- GitHub Actions CI on every push and PR — runs `next lint && tsc --noEmit --noUnusedLocals` (`.github/workflows/ci.yml`).

## What broke & what I figured out

### 1. Slow dashboard queries
Listing the messages of an open chat was taking ~400 ms — PostgreSQL was doing a `Seq Scan` and sorting in memory.

**Fix:** Added `@@index([chatId, createdAt])` on `Message`. The query plan switched to `Index Scan` and the fetch dropped by ~25 % (Chrome DevTools → Network, before vs after on the same dataset). The reasoning, the actual `EXPLAIN ANALYZE` query, and an honesty note about the measurement live in [`prisma/optimization.md`](./prisma/optimization.md).

### 2. Schema accidentally deleted by a "perf" commit
While adding the index above (commit `b85d4f5`), the `Chat` / `Message` / `GeneratedApp` block got dropped from `prisma/schema.prisma`. `npx prisma validate` failed; the app stopped booting.

**Fix:** Recovered the previous-revision schema from the parent commit, validated, and re-committed:

```bash
git show b85d4f5^:prisma/schema.prisma > prisma/schema.prisma
npx prisma validate
git add prisma/schema.prisma
git commit -m "fix: restore prisma schema (Chat/Message/GeneratedApp) accidentally removed in b85d4f5"
```

Recovery commit is `34b9565`. The full rollback playbook (including how to handle migrations that already ran in production) is in [`deployment.md`](./deployment.md).

### 3. Real-time streaming without cross-session leaks
SSE responses are constructed inside the route handler with a `ReadableStream` whose controller lives in a per-request closure — there is no module-scope buffer, so two simultaneous prompts can't bleed into each other's responses. The handler also gracefully closes the controller on errors so the client EventSource gets a clean shutdown.

## Architecture

```
[Client (Next.js / React)]  <-- SSE -->  [Next.js Route Handlers]  <-- Prisma + Neon -->  [PostgreSQL]
                                                |
                                                +-- Gemini API
                                                +-- Mistral API
```

## Run locally

```bash
git clone https://github.com/Eswar809/devsai.git
cd devsai
pnpm install
cp .env.example .env       # fill in DATABASE_URL + GEMINI_API_KEY (MISTRAL_API_KEY is optional)
npx prisma migrate dev
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

See [`deployment.md`](./deployment.md) — covers Vercel + Neon setup, environment-variable wiring, automatic `prisma migrate deploy` during build, and a step-by-step rollback path for both code-only and code + schema rollbacks.

## Project structure

```
devsai/
├── app/                # Next.js app-router pages + API routes (SSE streaming, S3 upload, OG image)
├── components/         # React components (UI, error boundary)
├── hooks/              # Custom React hooks
├── lib/                # Prisma client, prompt templates, sandpack config, stream parser
├── prisma/             # schema.prisma, migrations/, optimization.md
└── .github/workflows/  # CI: lint + type-check
```

## Author

**Deevi Eswar** — [GitHub](https://github.com/Eswar809) · [LinkedIn](https://www.linkedin.com/in/eswar-dev-55a54536a/) · [Portfolio](https://eswardev.netlify.app/)
