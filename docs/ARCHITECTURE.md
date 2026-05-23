# AIV — Architecture

## 1. Goals

1. **Enterprise-ready from day one.** Multi-tenant, audit-logged,
   role-gated, observable.
2. **Modular & feature-aligned.** Adding a feature should not require
   touching unrelated code.
3. **Replaceable infrastructure.** Domain logic is decoupled from
   Prisma, Supabase, Redis, and the AI providers so any of them can be
   swapped without rewriting use cases.
4. **Vercel-native, worker-friendly.** Edge-safe middleware, Node
   runtime for routes that need Prisma/Redis, and a separate worker
   entrypoint for BullMQ.

## 2. High-level layering

```
┌──────────────────────────────────────────────────────────────────┐
│  Presentation                                                    │
│  Next.js App Router  ·  Server Actions  ·  REST (route handlers) │
└────────────────┬─────────────────────────────────────────────────┘
                 │ (typed contracts via Zod)
┌────────────────▼─────────────────────────────────────────────────┐
│  Application                                                     │
│  Use cases per feature module (modules/<feature>/application)    │
│  Pure orchestration — depend on ports, not concrete impls.       │
└────────────────┬─────────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────────────┐
│  Domain                                                          │
│  Entities, value objects, ports, errors. No I/O. No framework.   │
└────────────────┬─────────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────────────┐
│  Infrastructure                                                  │
│  Prisma repos · Supabase · Redis · BullMQ · AI provider adapters │
└──────────────────────────────────────────────────────────────────┘
```

The **direction of dependency** is one-way (down). The domain never
imports infrastructure. The application layer talks to ports
(interfaces) declared alongside the domain.

## 3. Folder map

```
apps/web/
├── prisma/
│   └── schema.prisma                  ← single source of truth for the DB
├── src/
│   ├── app/                           ← Next.js App Router
│   │   ├── (auth)/                    ←   public auth pages + OAuth callback
│   │   │   ├── sign-in/page.tsx
│   │   │   ├── sign-up/page.tsx
│   │   │   ├── callback/route.ts
│   │   │   └── layout.tsx
│   │   ├── (app)/                     ←   protected shell
│   │   │   ├── layout.tsx             ←     defense-in-depth auth check
│   │   │   ├── page.tsx               ←     resolves default workspace
│   │   │   └── w/[workspace]/
│   │   │       ├── layout.tsx         ←     workspace context
│   │   │       └── overview/page.tsx
│   │   ├── api/
│   │   │   ├── health/route.ts
│   │   │   └── v1/
│   │   │       └── workspaces/route.ts
│   │   ├── providers.tsx              ← React Query + Toaster
│   │   ├── layout.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   ├── modules/                       ← Feature modules (clean arch)
│   │   ├── workspaces/                ← canonical example
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   ├── schemas.ts
│   │   │   └── index.ts               ← public barrel
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── seo/
│   │   ├── ai-visibility/
│   │   ├── billing/
│   │   └── notifications/
│   │
│   ├── components/
│   │   ├── ui/                        ← ShadCN primitives
│   │   ├── layout/                    ← Shell, Sidebar, Topbar
│   │   ├── charts/                    ← Reusable charts
│   │   ├── forms/                     ← Field wrappers, form patterns
│   │   └── shared/                    ← Empty states, banners, etc.
│   │
│   ├── lib/
│   │   ├── supabase/  (client | server | middleware | admin)
│   │   ├── prisma/    (singleton client)
│   │   ├── redis/     (shared connection)
│   │   ├── queue/     (BullMQ queues, workers, types, entrypoint)
│   │   ├── ai/        (orchestrator + provider adapters + prompts)
│   │   ├── logger/    (pino)
│   │   ├── errors/    (AppError + helpers)
│   │   ├── api/       (response envelope + request context)
│   │   ├── validation/(shared Zod schemas)
│   │   └── utils/     (cn, formatters)
│   │
│   ├── config/
│   │   ├── env.ts                     ← Zod-validated env
│   │   ├── site.ts
│   │   └── features.ts                ← feature flags
│   │
│   ├── hooks/                         ← reusable React hooks
│   ├── stores/                        ← Zustand (UI state only)
│   ├── types/                         ← shared TS types incl. Supabase
│   ├── styles/
│   ├── instrumentation.ts             ← server bootstrap hook
│   └── middleware.ts                  ← edge auth gate
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json                    ← ShadCN config
└── package.json
```

## 4. Multi-tenancy model

- **Workspace** is the tenant boundary. Every domain row carries
  `workspaceId`. Users belong to N workspaces via `WorkspaceMember`
  with a role (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- The URL always pins the active workspace: `/w/:slug/...`. The
  middleware does not enforce membership (it would require DB access);
  the workspace layout RSC does, and so does `requireWorkspace()` in
  every API route.
- **Postgres Row-Level Security** is the last line of defense. Define
  RLS policies on every tenant table keyed off
  `auth.uid() ↔ workspace_members`.

## 5. Authentication & authorization

| Concern         | Where                                              |
| --------------- | -------------------------------------------------- |
| Session cookie  | `lib/supabase/middleware.ts` refreshes per request |
| Auth gate       | `src/middleware.ts` (edge) — redirects only        |
| User identity   | `lib/supabase/server.ts` → `getUser()` in RSC      |
| Membership/role | `lib/api/context.ts` → `requireWorkspace(id, min)` |
| DB-level guard  | Supabase RLS                                       |

Defense-in-depth: every layer assumes the previous one might have been
bypassed.

## 6. Background jobs

```
[ Route Handler / Action ]            [ Worker process ]
        │                                    ▲
        │  queues.aiVisibilityScan.add(...)  │
        ▼                                    │
     Redis  ─────────  BullMQ queue  ────────┘
```

- Queues are declared in `lib/queue/queues.ts`. Payload types in
  `lib/queue/types.ts`.
- Workers live in `lib/queue/workers/*.worker.ts` and dispatch to the
  matching feature module's `application/` use case.
- The worker entrypoint (`pnpm worker:dev`) runs separately from the
  web process. **Vercel serverless functions are not appropriate for
  long-running workers** — host them on Railway, Fly, or a dedicated
  Vercel Background Function (when available).

## 7. AI orchestration

- One **orchestrator** (`lib/ai/orchestrator.ts`) with multiple
  pluggable **provider adapters** (Anthropic, OpenAI, Google,
  Perplexity).
- Prompts are versioned and referenced by id (`lib/ai/prompts/`).
- Per-workspace budgets, rate limits, and provider fan-out (for AI
  Visibility scans that ask the same prompt across providers) are
  centralized here — features never call provider SDKs directly.

## 8. Error handling

- `AppError` is the only exception type that route handlers and use
  cases throw. It carries `code`, `status`, `message`, `expose`.
- `withErrorHandling()` wraps every route handler and maps:
  - `AppError` → typed `{ error: { code, message, details? } }`
  - `ZodError` → `422` with flattened details
  - Anything else → `500 INTERNAL` + structured log
- Client never sees stack traces or internal error messages.

## 9. Logging & observability

- Structured logs via **pino** (`lib/logger`). JSON in production,
  pretty in development.
- Always log with structured fields (`logger.info({ jobId, ms }, "...")`),
  never with string concatenation.
- Reserved redaction paths for tokens / cookies / passwords.
- Wire Sentry in `instrumentation.ts` when `SENTRY_DSN` is set.

## 10. State management

- **Server state** → TanStack Query. Cache invalidation on mutations
  goes through query keys.
- **Client UI state** → Zustand stores, scoped per concern
  (`use-ui-store`, `use-workspace-store`).
- **Form state** → React Hook Form (or `useActionState`) — local to
  the form.

## 11. Deployment topology

```
            ┌───────────────────┐
  Browser ─►│   Vercel (web)    │──► Supabase Postgres (via pgbouncer)
            │  Next.js + RSC    │──► Supabase Auth
            └─────────┬─────────┘──► Supabase Storage
                      │
                      └──► Redis (Upstash / managed)
                                ▲
            ┌───────────────────┴─┐
            │   Worker host       │
            │   (Railway/Fly)     │──► AI providers (Anthropic/OpenAI/…)
            │   pnpm worker:start │
            └─────────────────────┘
```

## 12. Security checklist (foundation)

- Strict CSP headers (TODO once the app is wired) + the security
  headers already set in `next.config.ts`.
- `service_role` key only used inside `lib/supabase/admin.ts`, never
  imported by code that may bundle into the browser (`import
  "server-only"`).
- All inputs validated with Zod at the boundary.
- All tenant tables guarded by RLS.
- Webhook routes verify their signature before any side effect.

## 13. Testing strategy (placeholder)

- **Vitest** for unit tests of `domain/` and `application/`
  (framework-free → trivially testable).
- **Playwright** (to be added) for E2E on the protected dashboard.
- **`pnpm typecheck`** is treated as a first-class test signal.

## 14. What to build next

1. `auth` module: sign-in/sign-up forms wired to Supabase.
2. `workspaces` module presentation: onboarding form, switcher.
3. First migration + Supabase RLS policies.
4. Wire one end-to-end AI Visibility scan: route → queue → worker →
   AI orchestrator → DB.
