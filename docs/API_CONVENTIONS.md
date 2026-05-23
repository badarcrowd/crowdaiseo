# API conventions

All HTTP endpoints live under `/api/v<major>/...` so the public
contract can evolve without breaking clients.

## URL shape

```
/api/v1/<resource>[/<id>][/<sub-resource>]
```

- Plural, lowercase, kebab-case resources: `/workspaces`,
  `/projects/:id/seo-audits`.
- Verbs go in the HTTP method, not the URL. Reserve verb URLs for
  RPC-style operations that don't map to CRUD
  (e.g. `POST /projects/:id/scans:run`).

## Methods

| Method   | Semantics                                |
| -------- | ---------------------------------------- |
| `GET`    | Read. Idempotent. No side effects.       |
| `POST`   | Create or invoke an action.              |
| `PATCH`  | Partial update.                          |
| `PUT`    | Full replace (rare — prefer `PATCH`).    |
| `DELETE` | Soft-delete by default; explicit `?hard=true` for hard delete (admin only). |

## Status codes

| Code | When                                             |
| ---- | ------------------------------------------------ |
| 200  | OK — body has `{ data }`                         |
| 201  | Created — body has `{ data }`                    |
| 204  | No content                                       |
| 400  | Malformed request                                |
| 401  | Unauthenticated                                  |
| 403  | Forbidden (authenticated but no permission)      |
| 404  | Resource not found                               |
| 409  | Conflict (e.g. duplicate slug)                   |
| 422  | Validation error (body has `details`)            |
| 429  | Rate limited                                     |
| 5xx  | Server / upstream errors                         |

## Response envelope

**Success**

```json
{ "data": { ... } }
```

**Error**

```json
{
  "error": {
    "code": "VALIDATION",
    "message": "Invalid input",
    "details": { "fieldErrors": { "name": ["Required"] } }
  }
}
```

Every route handler should funnel through `ok()` / `created()` /
`withErrorHandling()` in `@/lib/api/response`.

## Validation

- Validate the request body with Zod at the very top of the handler.
- Validate query/path params the same way.
- The Zod schema lives in the feature module's `schemas.ts` so the
  same shape can be reused on the client form.

## Auth & authorization

- `requireUser()` — must be signed in.
- `requireWorkspace(workspaceId, minRole)` — must be a member with
  at least `minRole`. Used by every tenant-scoped route.
- Service-role calls (admin actions, webhooks) go through
  `lib/supabase/admin.ts` and are explicitly gated.

## Pagination

- Cursor-based by default (stable under inserts):
  `GET /things?cursor=<opaque>&limit=20`
- Response includes `nextCursor` in `data` (not in pagination
  headers — keeps the contract self-describing).

## Idempotency

- Mutating endpoints accept an optional `Idempotency-Key` header.
- Store the key + workspaceId hash in Redis for 24h; replay returns
  the cached response.

## Webhooks

- Live under `/api/v1/webhooks/<provider>`.
- Always verify the signature **before** parsing the body.
- Respond `200` quickly and offload work to a queue — never run the
  full processing in the webhook handler.

## API keys

- `Authorization: Bearer aiv_<prefix>_<secret>` for programmatic
  callers. Stored as `bcrypt(secret)`; the prefix is the visible
  identifier in the UI.

## Versioning

- Breaking changes get a new `/v<major>`. Additive changes stay on
  the current version.
- Deprecations are flagged via the `Deprecation` and `Sunset` response
  headers with at least a 90-day window.
