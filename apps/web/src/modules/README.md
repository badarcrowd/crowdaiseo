# Feature modules

Every feature lives in its own folder under `src/modules/<feature>` and
follows the same **clean-architecture layout**:

```
modules/<feature>/
├── domain/            # Pure types, value objects, business rules. No I/O.
│   ├── entities.ts
│   └── errors.ts
├── application/       # Use cases. Orchestrate the domain. Receive ports
│   │                  # via parameters — never import infrastructure.
│   ├── create-x.ts
│   └── list-x.ts
├── infrastructure/    # Adapters: Prisma repositories, third-party SDKs,
│   │                  # queue producers, Supabase storage, etc.
│   ├── x.repository.ts
│   └── x.queue.ts
├── presentation/      # Server actions, route handlers, React components
│   │                  # specific to the feature.
│   ├── actions.ts
│   └── components/
├── schemas.ts         # Zod schemas (shared by application + presentation)
└── index.ts           # Public barrel — the ONLY thing other modules
                       # may import from.
```

## Rules

1. **Direction of dependency**: `presentation` → `application` →
   `domain`. `infrastructure` implements interfaces declared in `domain`
   or `application`. Domain depends on nothing.
2. **No cross-module deep imports**. Other modules import only the
   barrel `@/modules/<feature>` — never `@/modules/<feature>/infra/...`.
3. **Use cases take their dependencies as arguments**, not by importing
   them. Makes them trivially testable.
4. **Schemas live next to the module** they describe so the contract
   stays close to the rules.
5. **No React in `domain` or `application`.** Keep them framework-free
   so they can later move to a worker / edge function / different app.

See `modules/workspaces/` for the canonical example.
