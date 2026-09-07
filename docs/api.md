# API Reference

> **Last updated**: 2026-09-07 — generated from `packages/backend/src/routes/`.
> Machine-readable version: [`docs/openapi.yaml`](./openapi.yaml) (OpenAPI 3.0).

All endpoints are prefixed with `/api/v1` unless noted otherwise. The single
exception is `GET /metrics`, which is served at the root.

## Conventions

- **Authentication**: session cookie (`componode_session`, `HttpOnly`) set by
  `POST /auth/login`, `POST /auth/register`, or the OIDC callback.
- **CSRF**: mutating requests must send `X-CSRF-Token` matching the
  `componode_csrf` cookie (double-submit pattern). The token is returned in the
  login/register response body and in the `csrf` query param of the OIDC
  callback redirect.
- **Roles**: `ADMIN`, `EDITOR`, `VIEWER`. Endpoint tables list the RBAC
  permission enforced by the `requireRole` plugin; "Authenticated" means any
  valid session.
- **Errors**: all errors use the envelope
  `{ "code": "<CODE>", "message": "...", "details": <optional> }`.
  Codes are a controlled enum (`ERROR_CODES` in `packages/core`).
- **Identifiers**: entity IDs are UUID v7; human-readable refs use `slug`.
- **Listing rules**: list queries exclude `RETIRED` records and `GONE`
  instances unless explicitly requested (`includeRetired`, `includeGone`).
- **GET/HEAD** routes are side-effect-free on domain state (ADR-094).
- **Rate limits**: `POST /auth/login` — 5 req/min; `POST /auth/register` —
  3 req/min. A global rate limit also applies.

## Error codes

| Code | Meaning |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | Bad username/password |
| `AUTH_RATE_LIMITED` | Too many auth attempts |
| `AUTH_NO_SESSION` | Missing/expired session (401) |
| `AUTH_FORBIDDEN` | Insufficient role (403) |
| `AUTH_USERNAME_TAKEN` | Username conflict (409) |
| `AUTH_RESET_TOKEN_INVALID` / `_EXPIRED` / `_USED` | Password reset token problems |
| `OIDC_NOT_CONFIGURED` / `OIDC_INVALID_STATE` / `OIDC_INVALID_CODE` / `OIDC_TOKEN_VERIFICATION_FAILED` / `OIDC_DISCOVERY_FAILED` | OIDC flow errors |
| `VALIDATION_FAILED` | Zod input validation failed (400) |
| `NOT_FOUND` | Resource not found (404) |
| `CONFLICT` | Generic conflict (409) |
| `CYCLE_DETECTED` | `COMPOSES` edge would create a cycle (409) |
| `INVALID_EDGE_TYPE` | Edge type/target constraint violated |
| `REFERENCED` | Delete blocked by existing references |
| `TYPE_CHANGE_BLOCKED` | Product type change not allowed |
| `SLUG_TAKEN` | Slug uniqueness conflict |
| `INTERNAL_ERROR` | Unhandled server error |

---

## Auth

| Method | Path | Description | Access |
|---|---|---|---|
| POST | `/auth/login` | Local login; sets session + CSRF cookies | Public (rate-limited) |
| POST | `/auth/logout` | Revoke current session; clears cookies | Public |
| GET | `/auth/session` | Current authenticated user | Authenticated |
| POST | `/auth/register` | Self-registration (only when `allow_self_registration` is on; 404 otherwise). Creates a `VIEWER` user and auto-logs in | Public (rate-limited) |
| POST | `/auth/password/change` | Change own password | Authenticated |
| POST | `/auth/password/reset` | Generate reset token for `{ userId }` | `password:reset:generate` (Admin) |
| POST | `/auth/password/reset/confirm` | Confirm reset with `{ token, newPassword }` | Public |
| GET | `/auth/oidc/status` | `{ enabled }` — is OIDC configured | Public |
| POST | `/auth/oidc/login` | 302 redirect to IdP (PKCE); query `redirect_uri` | Public |
| GET | `/auth/oidc/callback` | OIDC callback: exchanges `code`+`state`, JIT-provisions user, sets cookies, 302 redirects with `?csrf=` | Public |

### Request bodies

- `POST /auth/login`: `{ username, password }` → `200 { user, csrfToken }`
- `POST /auth/register`: `{ username, password, displayName? }` → `201 { user, csrfToken }`
- `POST /auth/password/change`: `{ currentPassword, newPassword }` → `204`
- `POST /auth/password/reset`: `{ userId }` → `200 { token }`
- `POST /auth/password/reset/confirm`: `{ token, newPassword }` → `204`

Username rules: 3–50 chars, `^[a-z0-9_-]+$`. Password: 8–128 chars.

## Users

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/users` | List users; query `role`, `isActive`, `search` | `user:list` (Admin) |
| GET | `/users/me` | Current user profile | Authenticated |
| GET | `/users/:id` | Get user by ID | `user:list` (Admin) |
| POST | `/users` | Create user `{ username, password, role, displayName?, email?, teamId? }` | `user:create` (Admin) |
| PATCH | `/users/:id` | Update `{ role?, displayName?, email?, teamId?, isActive? }` | `user:update` (Admin) |

`Person` fields: `id, username, oidcSubject?, role, displayName?, email?, teamId?, slug, isActive, createdAt, updatedAt` (`passwordHash` is never returned).

## Sessions

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/sessions` | List the current user's sessions | Authenticated |
| POST | `/sessions/:id/revoke` | Revoke a session by ID | Authenticated |
| GET | `/users/:id/sessions` | List sessions for a user | `user:listSessions` (Admin) |

`Session` fields: `id` (32-byte random token), `userId, createdAt, lastSeenAt, expiresAt, revokedAt?`.

## Settings

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/settings` | Read app settings | `settings:update` (Admin) |
| PATCH | `/settings` | Update `{ allowSelfRegistration?, sessionIdleTimeoutMs?, sessionAbsoluteTimeoutMs?, defaultUserRole? }` | `settings:update` (Admin) |
| GET | `/settings/oidc` | Read OIDC config | `oidc:configure` (Admin) |
| PUT | `/settings/oidc` | Replace OIDC config `{ enabled, issuer?, clientId?, clientSecretRef?, roleClaimPath?, claimValueField?, roleMapping? }`; tests issuer discovery | `oidc:configure` (Admin) |

Timeout values must be ≥ 60000 ms. `roleMapping` maps IdP claim values to
`ADMIN`/`EDITOR`/`VIEWER`.

## Health & metrics

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/health` | `{ status, database, uptime, version }`; 503 when DB is down | Authenticated |
| GET | `/metrics` | Prometheus exposition format — **no `/api/v1` prefix**, network-restricted in production | Public |

## Products

Product types: `BUSINESS_CAPABILITY`, `PLATFORM`, `CUSTOMER_FACING`.
Lifecycle: `ACTIVE`, `RETIRED`.

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/products` | List products; query `q`, `type`, `lifecycle`, `includeRetired` | Authenticated |
| POST | `/products` | Create `{ name, type, slug?, description?, lobOwnerId?, teamOwnerId? }` (slug auto-derives from name) | `product:create` |
| GET | `/products/:slug` | Product detail (composition edges, dependencies) | Authenticated |
| PATCH | `/products/:id` | Update `{ name?, slug?, description?, type?, lifecycle?, lobOwnerId?, teamOwnerId? }` | `product:update` |
| DELETE | `/products/:id` | Delete product | `product:delete` |

### Product edges

| Method | Path | Description | Access |
|---|---|---|---|
| POST | `/products/:id/composes` | Add `COMPOSES` edge `{ childId }` — parent must be `BUSINESS_CAPABILITY`/`CUSTOMER_FACING`; DAG enforced (`409 CYCLE_DETECTED`) | `product:edge:add` |
| DELETE | `/products/:id/composes/:childId` | Remove `COMPOSES` edge | `product:edge:remove` |
| POST | `/products/:id/consumes-from` | Add `CONSUMES_FROM` edge `{ platformId }` — target must be `PLATFORM` | `product:edge:add` |
| DELETE | `/products/:id/consumes-from/:platformId` | Remove `CONSUMES_FROM` edge | `product:edge:remove` |
| POST | `/products/:id/depends-on` | Add `DEPENDS_ON` edge `{ componentId }` | `product:edge:add` |
| DELETE | `/products/:id/depends-on/:componentId` | Remove `DEPENDS_ON` edge | `product:edge:remove` |

All edge mutations return `204` on success.

## Components

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/components` | Paginated list; query `page`, `pageSize` (max 100), `category`, `provider`, `lifecycle`, `status`, `componentGroup`, `group`, `search`, `sort` (`name`/`lastSeenAt`/`createdAt`), `order`, `includeRetired`, `includeGone` | Authenticated |
| GET | `/components/:id` | Get component by ID | Authenticated |
| PATCH | `/components/:id` | Assign `{ componentGroupId?, teamOwnerId? }` (nullable) | `component:update` |

Components are created/updated by importers, not via the API.

## Component groups

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/component-groups` | List groups; query `lifecycle` | Authenticated |
| GET | `/component-groups/:id` | Get group by ID | Authenticated |
| POST | `/component-groups` | Create `{ name, slug, description?, teamOwnerId? }` | `componentGroup:create` |
| PATCH | `/component-groups/:id` | Update `{ name?, slug?, description?, teamOwnerId?, lifecycle? }` | `componentGroup:update` |
| DELETE | `/component-groups/:id` | Delete group | `componentGroup:delete` |

## Importers

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/importers` | List importer manifests (name, version, config schema) | Authenticated |
| GET | `/importers/:name/schema` | `{ name, configSchema }` for one importer | Authenticated |
| GET | `/importer-configs` | List importer configurations | Authenticated |
| GET | `/importer-configs/:id` | Get one configuration | Authenticated |
| POST | `/importer-configs` | Create `{ importerName, label, scope?, secretRefs?, schedule?, enabled? }` | `importer:config:create` (Admin) |
| PATCH | `/importer-configs/:id` | Partial update of the same fields | `importer:config:update` (Admin) |
| DELETE | `/importer-configs/:id` | Delete configuration | `importer:config:delete` (Admin) |
| POST | `/importer-configs/:id/trigger` | Start a run → `202 { runId }` | `importer:run:trigger` |
| GET | `/importer-configs/:id/runs` | List runs for a config | Authenticated |
| GET | `/importer-configs/:configId/runs/:runId` | Run detail | Authenticated |
| GET | `/importer-configs/:configId/runs/:runId/errors` | Run errors | Authenticated |
| POST | `/importer-configs/:configId/runs/:runId/cancel` | Cancel a `PENDING`/`RUNNING` run (`409 RUN_NOT_ACTIVE` otherwise) | `importer:run:cancel` |

`secretRefs` items: `{ key, env?, file? }` — either `env` or `file` is
required. Secrets are resolved from environment/files at run time and are
never stored or logged.

Run statuses: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`.

## Organization

Identical CRUD shape for Lines of Business (`/lobs`) and Teams (`/teams`).
Body: `{ name, slug?, description? }` (strict — unknown fields rejected).

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/lobs` | List lines of business | Authenticated |
| POST | `/lobs` | Create LoB | `lob:create` |
| PATCH | `/lobs/:id` | Update LoB | `lob:update` |
| DELETE | `/lobs/:id` | Delete LoB | `lob:delete` |
| GET | `/teams` | List teams | Authenticated |
| POST | `/teams` | Create team | `team:create` |
| PATCH | `/teams/:id` | Update team | `team:update` |
| DELETE | `/teams/:id` | Delete team | `team:delete` |
| GET | `/teams/:id/members` | List team members | Authenticated |

Slug pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

## Dashboard

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/dashboard/summary` | Read-only aggregates for the health-and-attention dashboard | Authenticated |

## Search

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/search` | Global search for the Ctrl+K palette; query `q` (required, ≤100 chars), `limit` (1–20, default 8) | Authenticated |
