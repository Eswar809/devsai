# DevsAI — Autonomous AI Code-Generation Platform

> 🚀 **Live Demo:** [https://devsai.vercel.app](https://devsai.vercel.app) *(deployment pending — update this URL after deploying)*

## What I Built

A full-stack AI code-generation platform where users describe an app in natural language and receive multi-file React projects generated autonomously. Built with **Next.js**, **TypeScript**, and **PostgreSQL** via **Prisma ORM**, with real-time output delivered via **Server-Sent Events (SSE)** streaming.

**Tech Stack:** Next.js 15 · TypeScript · PostgreSQL (Prisma) · Gemini API · Tailwind CSS · SSE Streaming

## What Broke & What I Figured Out

### Feature: Real-time Streaming Performance
Initially, returning complete LLM responses caused significant latency for end-users.

**Fix:** Implemented per-request Server-Sent Events (SSE) streaming with ReadableStream to stream LLM responses chunk-by-chunk. This ensures that the response is delivered progressively without using shared buffers or module-level state, safely supporting concurrent users without data leakage.

### Bug 2: Slow Dashboard Queries
The dashboard page listing a user's recent projects was loading in ~400ms. PostgreSQL was doing a full sequential scan on the projects table.

**Fix:** Added a composite index on `(user_id, created_at)`. Query plan changed from `Seq Scan` → `Index Scan`, reducing latency by ~25% (measured via browser DevTools).

## Architecture

```
[Client (Next.js/React)] <---(SSE)---> [API Routes (Next.js)] <---> [PostgreSQL (Prisma)]
                                              |
                                        [Gemini AI API]
```

## Setup

1. Clone the repo
```bash
git clone https://github.com/Eswar809/devsai.git
cd devsai
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Add your database URL and API keys to .env
```

4. Set up the database
```bash
npx prisma db push
```

5. Run the development server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view it.

## Project Structure

```
devsai/
├── app/              # Next.js app router pages & API routes
├── components/       # React components (ErrorBoundary, UI)
├── hooks/            # Custom React hooks
├── lib/              # Utilities (stream isolation, helpers)
├── prisma/           # Database schema & migrations
├── public/           # Static assets
└── .github/workflows # CI pipeline (lint + type-check)
```

## Author

**Deevi Eswar** — [GitHub](https://github.com/Eswar809) · [LinkedIn](https://www.linkedin.com/in/eswar-dev-55a54536a/) · [Portfolio](https://eswardev.netlify.app/)
