# Coding standards & naming

## Language

- **TypeScript strict mode**, no `any`. Use `unknown` + narrowing.
- Prefer `type` over `interface` unless declaration merging is needed.
- `import type` for type-only imports (enforced by ESLint).
- No default exports for app code (only Next.js requires them for
  `page.tsx`, `layout.tsx`, route handlers). Named exports everywhere
  else — they refactor-rename safely.

## File & folder naming

| Kind                                | Convention             | Example                          |
| ----------------------------------- | ---------------------- | -------------------------------- |
| React component file                | `PascalCase.tsx`       | `SidebarNav.tsx`                 |
| React component (in `components/ui/`) | `kebab-case.tsx` (ShadCN convention) | `button.tsx`           |
| Hook                                | `use-kebab-case.ts`    | `use-current-workspace.ts`       |
| Store                               | `use-<name>-store.ts`  | `use-ui-store.ts`                |
| Use case / pure module              | `kebab-case.ts`        | `create-workspace.ts`            |
| Worker                              | `<domain>.worker.ts`   | `ai-visibility.worker.ts`        |
| Route handler                       | `route.ts`             | `app/api/v1/.../route.ts`        |
| Folder                              | `kebab-case`           | `ai-visibility`                  |
| Schema                              | `schemas.ts`           | colocated with the module        |

## Code conventions

- **Identifiers**: `camelCase` variables/functions, `PascalCase` types
  and React components, `SCREAMING_SNAKE_CASE` for top-level
  immutable constants (e.g. `QUEUE_NAMES`).
- **Booleans** start with `is/has/can/should`.
- **Functions** are verbs (`createWorkspace`, not `workspaceCreator`).
- **Return early**, avoid `else` after `return`.
- **No top-level side effects** in modules other than dedicated
  bootstrap files (`instrumentation.ts`, worker entrypoints).
- **Comments** explain *why*, not *what*. Default to none.
- **No dead code** — remove rather than comment out.

## Imports

- Use the `@/` alias for everything inside `src/`. No relative paths
  that climb (`../../..`).
- Order: external → `@/lib` / `@/config` → `@/modules` → `@/components`
  → relative. (Prettier handles formatting; the order is a guideline.)
- Server-only code must `import "server-only"` so a misplaced client
  import fails the build.

## Errors

- Throw `AppError` subclasses, never plain `Error`, from anything that
  may reach the API layer.
- Never throw strings.
- Catch only when you can add information or recover; otherwise let it
  propagate to `withErrorHandling`.

## React / Next.js

- Default to **Server Components**. Add `"use client"` only when
  needed (state, refs, event handlers, browser APIs).
- Co-locate components used in a single page under that page's folder
  (`_components/`). Promote to `src/components/` only when reused.
- Forms: React Hook Form + Zod resolver (or `useActionState` + a
  server action). Don't roll your own.
- No `useEffect` for data fetching — use React Query or RSC.

## Database

- Every tenant table has `workspaceId` and a Supabase RLS policy.
- Index every foreign key and every column used in a `where` clause
  by a high-volume query.
- Never raw-SQL string-interpolate user input. Use Prisma or
  parameterized queries.

## Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:`. Scope optional: `feat(ai-visibility): ...`.
- One logical change per commit. Use `git add -p` if you need to.
