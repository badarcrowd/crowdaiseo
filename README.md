# AIV — Enterprise AI SEO & AI Visibility Platform

A production-grade SaaS foundation for monitoring how your brand appears
across AI search engines (ChatGPT, Claude, Gemini, Perplexity) plus
classical SEO intelligence.

> This repo currently contains **architecture only** — no business
> features are implemented yet. The structure is designed so feature
> teams can land code without re-litigating cross-cutting concerns.

## Tech stack

| Layer            | Choice                                                    |
| ---------------- | --------------------------------------------------------- |
| Framework        | Next.js 15 (App Router, RSC, Turbopack)                   |
| Language         | TypeScript 5.7 (strict)                                   |
| Styling          | TailwindCSS 3 + ShadCN UI + Framer Motion                 |
| Auth             | Supabase Auth (`@supabase/ssr`)                           |
| Database         | Supabase Postgres via Prisma ORM                          |
| Cache / Rate-limit | Upstash- or self-hosted Redis (ioredis)                  |
| Background jobs  | BullMQ on Redis                                           |
| State            | TanStack Query (server) + Zustand (client UI)             |
| Validation       | Zod everywhere a boundary is crossed                      |
| Logging          | Pino (structured JSON in prod, pretty in dev)             |
| Deployment       | Vercel (web) + a worker host of choice (Railway / Fly)    |
| Monorepo         | pnpm workspaces + Turborepo                               |

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill secrets
pnpm db:generate
pnpm dev
```

## Top-level layout

```
AIV/
├── apps/
│   └── web/             # Next.js app
├── packages/            # (future) shared libraries
├── docs/                # Architecture & conventions
├── package.json         # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Coding standards & naming](./docs/CODING_STANDARDS.md)
- [API conventions](./docs/API_CONVENTIONS.md)
- [Monorepo & scaling plan](./docs/MONOREPO.md)
