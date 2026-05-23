# Implementation steps (from scaffold → MVP)

The repo currently contains **architecture only**. These are the
ordered steps to turn it into a running, feature-complete MVP.

## Phase 0 — Local boot (½ day)

1. `pnpm install` at the repo root.
2. Create a Supabase project. Copy the URL + anon key + service-role
   key + DB connection strings into `apps/web/.env.local`.
3. Provision Redis (Upstash free tier or local Docker).
4. `pnpm db:push` to create the initial schema.
5. `pnpm dev` — confirm `/` renders and `/api/health` returns `ok`.

## Phase 1 — Auth & workspaces (1–2 days)

1. Build `modules/auth/presentation/` — sign-in / sign-up forms wired
   to Supabase Auth (email OTP + Google OAuth).
2. Implement the OAuth callback flow (already scaffolded).
3. Build the workspace onboarding form (`modules/workspaces/presentation/`).
4. Wire `requireWorkspace()` and the `(app)/w/[workspace]` layout to
   load + display the workspace name.
5. Add Postgres RLS policies for every tenant table:
   `auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = ...)`.

## Phase 2 — Projects (½ day)

1. CRUD for `Project` under `modules/projects/`.
2. Validate domains with a Zod schema + a quick HEAD check.

## Phase 3 — First AI Visibility scan, end-to-end (3–5 days)

1. Add `Prompt`, `Scan`, `ScanResult` models to `schema.prisma`.
2. Implement `modules/ai-visibility/application/run-scan.ts` taking a
   `scanRepo` and `aiOrchestrator` as deps.
3. Implement the Anthropic & OpenAI adapters in `lib/ai/providers/`.
4. Wire `queues.aiVisibilityScan.add(...)` from a route handler.
5. Wire `aiVisibilityWorker` to call `run-scan.ts`.
6. Build the results UI under `(app)/w/[workspace]/ai-visibility`.

## Phase 4 — Observability & ops (1–2 days)

1. Add Sentry in `instrumentation.ts`.
2. Add basic rate limiting (sliding-window via Redis) in middleware
   for `/api/v1/*`.
3. Add audit log writes around every mutation (`prisma.auditEvent.create`).
4. Stand up the worker on Railway/Fly with health checks.

## Phase 5 — Billing (2–3 days)

1. Integrate Stripe (Checkout + Customer Portal + Webhooks).
2. Map plans to `PlanTier` and gate features in `config/features.ts`
   per workspace tier.
3. Track per-workspace AI token usage in the `Job` table and surface
   it in settings.

## Phase 6 — Hardening before launch

- [ ] CSP headers (script-src/style-src nonces).
- [ ] CSRF protection on all state-changing endpoints called from the
      browser (Supabase cookies + same-site = strict; verify origin).
- [ ] Pen-test the RLS policies (try cross-workspace read/write).
- [ ] Run `pnpm typecheck`, `lint`, `test`, and Playwright in CI.
- [ ] Add `/api/v1/health/deep` that pings Postgres + Redis.

## Definition of "feature-complete module"

For any module in `modules/`:

- [ ] `domain/` types + ports
- [ ] `application/` use cases with unit tests
- [ ] `infrastructure/` Prisma repo and (if any) queue producers
- [ ] `presentation/` components / actions / route handlers
- [ ] `schemas.ts` covers every external boundary
- [ ] Public barrel `index.ts` exports nothing internal
- [ ] Audit-log events emitted for every mutation
- [ ] RLS policies for any new tables
