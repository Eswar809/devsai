# DevSai - AI Code Generation Platform

## What I Built
A full-stack Next.js application that uses AI to generate code. Features real-time streaming, user authentication, and PostgreSQL database.

## What Broke & What I Figured Out
During testing, I noticed that concurrent sessions were sharing event buffers. This was leading to a data corruption bug where one user would see another user's generated code. I fixed this by isolating the SSE stream buffers per session.

## Architecture
[Client (Next.js)] <---(SSE)---> [API Routes] <---> [PostgreSQL (Prisma)]
                                     |
                                  [OpenAI]

## Setup
1. Clone the repo
2. Run \
pm install\
3. Set up \.env\
4. Run \
px prisma db push\
5. Run \
pm run dev\

## Live Demo
Pending Deployment.
