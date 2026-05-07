# Deployment Runbook (Vercel + Neon Postgres)

## Prerequisites

- Vercel account with this repo linked as a project
- Neon Postgres database (the free tier is sufficient — uses `@prisma/adapter-neon` for serverless connections)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- *(optional)* Mistral API key, AWS S3 credentials for the image-upload route

## Environment variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables** for the `Production` and `Preview` environments:

| Variable | Source | Required |
|---|---|---|
| `DATABASE_URL` | Neon connection string (pooled, include `?sslmode=require`) | yes |
| `GEMINI_API_KEY` | Google AI Studio | yes |
| `MISTRAL_API_KEY` | Mistral console | optional — Gemini-only mode works without it |
| `S3_UPLOAD_KEY` / `S3_UPLOAD_SECRET` / `S3_UPLOAD_BUCKET` / `S3_UPLOAD_REGION` | AWS IAM | optional — only the `/api/s3-upload` route uses these |

> Migrations apply automatically on every deploy. The build script in `package.json` is `prisma generate && prisma migrate deploy && next build`, so any new migrations in `prisma/migrations/` will be applied before `next build` runs.

## First deploy

1. Push to `main` (or open a PR — Vercel auto-creates a preview deployment).
2. Vercel runs: `pnpm install` → `prisma generate` → `prisma migrate deploy` → `next build`.
3. If a migration fails, the build fails — check Vercel build logs and confirm `DATABASE_URL` is reachable from Vercel's runners.
4. After the first successful deploy, smoke-test the production URL (see below).

## Schema changes after first deploy

Generate the migration locally first so the SQL is reviewable in the PR:

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate the migration locally against a dev database
npx prisma migrate dev --name <descriptive_change_name>

# 3. Commit the new folder under prisma/migrations/
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): <change>"
git push
```

Vercel will run `prisma migrate deploy` during the next build and apply the new migration to the production database.

## Rollback path

### Code-only rollback (no schema change in the bad deploy)

1. **Vercel Dashboard → Deployments →** find the last good deployment → **Promote to Production**, **OR**
2. `git revert <bad_commit>` and push — Vercel deploys the revert.

### Code + schema rollback (the bad deploy ran a migration)

1. Promote the previous good deployment in Vercel (step above).
2. The migration is still recorded as applied in `_prisma_migrations`. Mark it rolled back so Prisma doesn't try to re-run it:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_folder_name>
   ```
3. Prisma does not generate down-migrations. Either:
   - **Forward-fix:** write a new migration that reverses the schema change, OR
   - **Manual SQL:** connect to the Neon DB and undo the change via `psql` / Neon console.
4. Commit the forward-fix migration and re-deploy.

### Hard recovery — schema file accidentally removed (real incident)

This actually happened on this repo: commit `b85d4f5` ("perf: add composite index...") removed the `Chat` / `Message` / `GeneratedApp` models from `prisma/schema.prisma` while adding the index. Recovery used a parent-commit checkout:

```bash
# Pull the previous-revision schema file out of the parent commit
git show b85d4f5^:prisma/schema.prisma > prisma/schema.prisma

# Validate before re-committing
npx prisma validate

git add prisma/schema.prisma
git commit -m "fix: restore prisma schema (Chat/Message/GeneratedApp) accidentally removed in b85d4f5"
```

The recovery commit is `34b9565` — see `git log` for the full history.

## Smoke test after every deploy

1. Visit `/` → landing page renders.
2. Create a chat → message persists across reload (confirms DB write + read).
3. Trigger code generation → SSE stream renders incrementally (confirms `GEMINI_API_KEY` is set and `/api/get-next-completion-stream-promise` is reachable).
4. *(if S3 enabled)* Upload an image in chat → image URL returns from `/api/s3-upload`.

If any step fails, check Vercel function logs (Dashboard → Project → Logs) before rolling back.
