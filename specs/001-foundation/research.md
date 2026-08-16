# Research: Foundation

**Feature**: 001-foundation
**Date**: 2026-08-16

This document resolves the technical unknowns identified in the plan's
Technical Context section and documents best practices for the
foundation's key technology choices.

---

## R1: PostgreSQL driver — `pg` (node-postgres)

**Decision**: Use `pg` (node-postgres) as the Kysely dialect driver.

**Rationale**:
- **Kysely integration**: `pg` has built-in `PostgresDialect` in Kysely
  core (mature, battle-tested). The alternative (`postgres` / postgres.js)
  requires the external `kysely-postgres-js` package — an extra dependency.
- **Maintenance**: `pg` is significantly more active (13K stars, 43M
  weekly downloads, frequent commits through 2025, large team).
  `postgres.js` has a slower release cadence and community-raised
  maintenance concerns (Oct 2025).
- **Bundle size**: `pg` is smaller (~28KB packaged) vs `postgres.js`
  (~62KB in v3.x).
- **TLS support**: Both offer comparable TLS. `pg` supports direct SSL
  negotiation for PostgreSQL 17+.
- **Prepared statements**: `pg` requires explicit naming, which is
  advantageous for AWS RDS Proxy / pgBouncer transaction pooling (avoids
  connection pinning). `postgres.js` uses prepared statements by default,
  requiring `prepare: false` to disable for proxy environments.
- **Windows compatibility**: Both work with pure JavaScript. `pg`'s
  native bindings have Windows compilation issues (use pure JS version).

**Alternatives considered**:
- `postgres` (postgres.js) — rejected: external Kysely dialect package,
  slower maintenance, larger bundle. Only preferable if tagged template
  API or Bun/Cloudflare Workers support is needed (not applicable to
  Componode).

**Configuration** (per ADR-101):
- `MAX_DB_CONNECTIONS` env var (default 10)
- `DATABASE_SSL_MODE` env var (`require` in production, `disable` in dev)
- `DATABASE_SSL_CA` env var (path to CA cert for `verify-full`)
- Pool budget: 10 (app) + 3 (importer concurrency, deferred to 002) + 5
  (reserved) = 18 < Postgres `max_connections` (100)

---

## R2: OIDC library — `openid-client` (with Fastify wrapper)

**Decision**: Use `openid-client` as the OIDC client library, wrapped in
a Fastify plugin within `packages/backend/src/plugins/oidc.ts`.

**Rationale**:
- `openid-client` is the most comprehensive OIDC client library for
  Node.js — supports authorization code flow with PKCE, ID token
  verification, discovery (Okta, Keycloak, Entra ID, Google), and refresh
  tokens.
- A custom Fastify wrapper (rather than a third-party Fastify OIDC
  plugin) gives full control over the session integration, JIT
  provisioning (ADR-027), and claim-to-role mapping (ADR-074). The
  wrapper is ~100 lines — the OIDC flow is: redirect to IdP → callback →
  token exchange → ID token verification → user lookup/create → session
  creation.
- `@fastify/passport` + `openid-client` has known integration issues
  (infinite redirect loops, session compatibility with server-side
  sessions). Componode uses server-side Postgres sessions (ADR-043), not
  Passport's session model — a direct wrapper avoids this conflict.
- `@fastify/oauth2` is OAuth2-focused with limited ID token verification
  — OIDC requires ID token verification, which is the core of the
  "verify the user's identity" guarantee.

**Alternatives considered**:
- `fastify-openid-auth` (wraps `openid-client`) — rejected: small
  community, last published 2023, not maintained. The underlying
  `openid-client` is the value; wrapping it ourselves is safer.
- `@fastify/passport` + `openid-client` — rejected: session model
  conflict with server-side Postgres sessions.
- `oidc-provider` — rejected: this is for building an OIDC *server*
  (IdP), not a client (RP).

**Configuration** (per ADR-073):
- OIDC config stored in `oidc_config` table (single row)
- `clientSecretRef` resolved via `SecretResolver` (env resolver in v1)
- State parameter: cryptographically random, stored in session for
  CSRF protection during OIDC flow
- PKCE: S256 code challenge (mandatory, even if the IdP doesn't require
  it — defense in depth)

---

## R3: shadcn/ui + Vite setup

**Decision**: Use shadcn/ui with Tailwind CSS v4 and the
`@tailwindcss/vite` plugin. Path aliases configured in both
`tsconfig.json` and `vite.config.ts`.

**Rationale**:
- shadcn/ui officially supports Vite (since 2024). The setup is
  straightforward: install Tailwind v4, configure path aliases, create
  `components.json`, and use the CLI (`npx shadcn@latest add [component]`)
  to add components.
- Tailwind v4 uses the `@tailwindcss/vite` plugin (no `postcss.config.js`
  needed — simpler than v3).
- shadcn/ui components are copied into the project (not imported from a
  package) — full control over styling and accessibility.

**Setup steps**:
1. Install: `pnpm add tailwindcss @tailwindcss/vite
   class-variance-authority clsx tailwind-merge lucide-react
   @radix-ui/react-slot tailwindcss-animate`
2. Configure `vite.config.ts` with `@tailwindcss/vite` plugin + path
   alias `@` → `./src`
3. Configure `tsconfig.json` and `tsconfig.app.json` with `baseUrl` +
   `paths` for `@/*`
4. Create `components.json` (shadcn config, `rsc: false`, Vite mode)
5. Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
6. Add components via `npx shadcn@latest add button card dialog input
   label table form` etc.

**Gotchas**:
- Vite splits TS config — update **both** `tsconfig.json` and
  `tsconfig.app.json` with path aliases
- For Tailwind v4, leave `tailwind.config` empty in `components.json`
- shadcn/ui components use Radix UI primitives — these are WAI-ARIA
  compliant, supporting the WCAG 2.1 AA requirement (FR-026)

---

## R4: Session token generation

**Decision**: Use `crypto.randomBytes(32).toString('base64url')` for
session ID generation.

**Rationale**:
- ADR-099 mandates 32-byte cryptographically random session IDs (not
  UUID v7). `crypto.randomBytes` is Node.js built-in (no dependency).
- `base64url` encoding produces a 43-character URL-safe string.
- The `sessions.id` column is `text` (not `uuid`) per ADR-077's update.

**Alternatives considered**:
- UUID v4 (`crypto.randomUUID()`) — rejected: only 122 bits of
  randomness, not the 256-bit standard for session tokens.
- UUID v7 — rejected: 74 bits of randomness (ADR-099 exception).

---

## R5: Password reset token flow

**Decision**: Generate a 32-byte random token, store its SHA-256 hash in
`password_reset_tokens`, display the plaintext token to the admin.

**Rationale** (per ADR-099):
- 32-byte random token via `crypto.randomBytes(32).toString('base64url')`
- SHA-256 hash via `crypto.createHash('sha256')` — stored in DB, not the
  plaintext token (if the DB leaks, tokens are useless)
- 15-minute expiry (`expiresAt`)
- Single-use (`usedAt` set on consumption)
- Admin triggers reset → token generated → token displayed to admin →
  admin communicates out-of-band → user submits new password + token →
  token verified (hash match + not expired + not used) → password
  updated → token invalidated

**Alternatives considered**:
- Store plaintext token in DB — rejected: DB leak = all reset tokens
  usable.
- Email delivery — rejected for v1 (no SMTP integration; post-v1
  enhancement per ADR-099).

---

## R6: CSRF double-submit cookie implementation

**Decision**: Custom Fastify plugin implementing the double-submit
cookie pattern.

**Rationale** (per ADR-087):
- The backend sets a `componode_csrf` cookie (`HttpOnly: false`,
  `SameSite: Lax`, `Secure` matches session cookie) with a
  cryptographically random value.
- The frontend reads the cookie via `document.cookie` and sends the
  value as an `X-CSRF-Token` header on every state-changing request.
- The backend's `preHandler` compares the cookie value to the header
  value — mismatch = `403`.
- No server-side token store needed (stateless pattern).
- The `@fastify/csrf-protection` plugin exists but uses a signed-cookie
  approach — the double-submit pattern is simpler and stateless.

**Implementation**:
- `plugins/csrf.ts`: sets the CSRF cookie on auth responses, registers
  a `preHandler` on POST/PUT/PATCH/DELETE routes that compares cookie to
  header.
- Frontend `api/client.ts`: reads the CSRF cookie, sets `X-CSRF-Token`
  header on all non-GET requests.

---

## R7: Pino redaction filter configuration

**Decision**: Configure Pino with a `redact` array covering all
sensitive field paths.

**Rationale** (per ADR-090):

```typescript
{
  redact: {
    paths: [
      'password',
      'passwordHash',
      'clientSecret',
      'secretRefs',
      'secrets',
      'secrets.*',
      'sessionToken',
      'sessionId',
      'authorization',
      'cookie',
      'oidcSubject',
      'email',
      'importer_configs.secretRefs',
      'importer_configs.scope'
    ],
    censor: '[REDACTED]'
  }
}
```

- Pino's `redact` option replaces matching paths with `[REDACTED]` before
  serialization — secrets never reach the log transport.
- The `secrets.*` wildcard catches any nested secret field.
- `importer_configs.scope` is redacted because scope values can contain
  account IDs or tokens.

---

## R8: Prometheus metrics for the foundation

**Decision**: Use `prom-client` with default metrics + custom HTTP
request counter + auth event counter + DB pool gauge.

**Rationale** (per ADR-069, Principle VII):

Metrics exposed at `/metrics` (unauthenticated, network-policy-
restricted):
- `http_requests_total` (counter, labels: method, route, status)
- `http_request_duration_seconds` (histogram, labels: method, route)
- `auth_events_total` (counter, labels: event, outcome)
- `db_pool_size` (gauge)
- `db_pool_available` (gauge)
- `db_query_duration_seconds` (histogram, labels: operation)
- `rate_limit_events_total` (counter, labels: endpoint)
- Default Node.js metrics (event loop lag, GC, memory, CPU)

The `/metrics` endpoint is registered as a Fastify route (not behind
auth or RBAC — ADR-069 specifies unauthenticated with network policy
restriction).

---

## R9: Kysely migration structure

**Decision**: Three migration files for the foundation.

**Rationale** (per ADR-078, ADR-077, ADR-100):

1. `001_initial_schema.ts` — creates all 28 tables with CHECK constraints
   generated from `core` constants. Includes:
   - All entity tables (persons, sessions, digital_products, components,
     component_instances, component_groups, line_of_businesses, teams)
   - Junction tables (product_composes, product_consumes_from,
     product_depends_on_component, component_depends_on_component,
     component_sources_from, component_exposes)
   - Operational tables (importer_configs, import_runs,
     import_run_errors, oidc_config, app_settings,
     password_reset_tokens)
   - Audit tables (entity_changes, edge_changes)
   - Kysely migration tables (kysely_migration, kysely_migration_lock)
   - FK constraints with `ON DELETE SET NULL` for audit table
     `createdBy`/`updatedBy` (ADR-100)
   - Denormalized `createdByName`/`updatedByName` on audit tables

2. `002_append_only_triggers.ts` — creates `BEFORE UPDATE OR DELETE`
   triggers on `entity_changes`, `edge_changes`, `import_run_errors`
   that raise an exception unconditionally (ADR-100).

3. `003_terminal_state_triggers.ts` — creates `BEFORE UPDATE` trigger
   on `import_runs` that raises if `OLD.status` is terminal
   (`COMPLETED`/`FAILED`/`CANCELLED`/`INTERRUPTED`) (ADR-100).

The CHECK constraint helper (`check-constraint-helper.ts`) imports
constants from `core` and generates the inline CHECK SQL — e.g.
`CHECK (category IN ('COMPUTE', 'STORAGE', ...))` from
`COMPONENT_CATEGORIES`.

---

## R10: Frontend routing and auth guard

**Decision**: React Router with a route guard component that checks
session validity before rendering protected routes.

**Rationale**:
- React Router (already in the stack per ADR-010) handles client-side
  routing.
- An `AuthGuard` component wraps protected routes: it calls
  `GET /api/v1/auth/session` on mount; if 401, redirects to `/login`;
  if 200, renders the protected route.
- TanStack Query caches the session check (staleTime: 60s) to avoid
  re-checking on every navigation.
- The login page (`/login`) and register page (`/register`, if enabled)
  are public routes (outside `AuthGuard`).
- The OIDC callback route (`/auth/oidc/callback`) is public (handles
  the IdP redirect).

**Route structure**:
```
/login                    → LoginPage (public)
/register                 → RegisterPage (public, if enabled)
/auth/oidc/callback       → OIDCCallbackPage (public)
/                         → Dashboard (protected)
/products                 → ProductsPage (protected, empty state)
/components               → ComponentsPage (protected, empty state)
/importers                → ImportersPage (protected, empty state)
/settings                 → SettingsPage (protected, admin for OIDC config)
/settings/users           → UsersPage (protected, admin only)
```
