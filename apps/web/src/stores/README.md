# Stores (Zustand)

**State-management policy:**

- **Server state** (anything that originates on the server: workspaces,
  projects, scans, jobs) → **TanStack Query** only. Never mirror it
  into a Zustand store — that creates two sources of truth.
- **Client UI state** (open modals, sidebar collapse, theme, ephemeral
  form state shared across components) → **Zustand**.
- **Single-component state** → `useState` / `useReducer`. Don't promote
  to a store until two unrelated components need it.

Each store gets its own file, exposes a typed hook, and is named
`use<Name>Store` for consistency. Persist only what is safe to restore
without re-validating against the server.
