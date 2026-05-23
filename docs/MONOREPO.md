# Monorepo & scaling plan

## Current state

```
AIV/
├── apps/web/          ← Next.js app (everything lives here today)
├── packages/          ← empty — reserved for shared code
├── pnpm-workspace.yaml
└── turbo.json
```

We start with **one app** and lift code into `packages/` only when a
second consumer appears. Premature extraction is the #1 cause of
monorepo pain.

## When to lift code into a package

Extract when **two or more** workspace apps need the same code, OR
when the code is genuinely independent and benefits from its own
build/test cycle:

| Candidate                  | Trigger                                            |
| -------------------------- | -------------------------------------------------- |
| `packages/database`        | Worker service is split out (Prisma client shared) |
| `packages/ui`              | A second app needs the same ShadCN component set   |
| `packages/config`          | Shared ESLint / TS / Prettier config across apps   |
| `packages/types`           | Shared OpenAPI / SDK types                         |
| `packages/ai`              | Externalized AI orchestrator reused by other tools |
| `packages/queue`           | Workers grow to their own deployable               |

## Planned future apps

| App                           | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| `apps/web` (current)          | Customer-facing dashboard                         |
| `apps/worker`                 | BullMQ workers — split out once load justifies it |
| `apps/marketing`              | Public site (currently inside `web` as `(marketing)`) — split when SEO/marketing iteration cadence diverges from product |
| `apps/admin`                  | Internal staff console — separate auth and deploy |
| `apps/docs`                   | Customer-facing API docs (Mintlify / Nextra)      |

## Conventions when extracting

1. **Name packages `@aiv/<thing>`** in their `package.json`. Add
   `"main"`/`"types"` pointing at source; let Turbo handle the build
   per app.
2. **No package depends on an app.** Dependencies flow apps → packages.
3. **Each package has its own `tsconfig.json` extending
   `tsconfig.base.json`.** Use TS project references when builds
   become slow.
4. **Run shared scripts via Turbo**, never via lerna-style chains.
5. **CI** caches `.turbo/` across runs (remote cache when team scales).

## Deployment per app

| App     | Host                      | Notes                                  |
| ------- | ------------------------- | -------------------------------------- |
| `web`   | Vercel                    | RSC + edge middleware + Node routes    |
| `worker`| Railway / Fly.io          | Long-running Node process; not Vercel  |
| `admin` | Vercel (separate project) | Separate auth realm, IP-restricted     |

## Anti-patterns to avoid

- A `packages/shared` grab-bag — split by capability, not by "stuff
  used in more than one place."
- Cross-package deep imports — only import from the package root.
- Re-exporting Prisma types from a UI package — keep UI free of DB
  types.
