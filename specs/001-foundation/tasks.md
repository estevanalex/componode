# Tasks: Foundation

**Input**: Design documents from `/specs/001-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — Constitution Principle VI (Test-First) is non-negotiable. Tests are written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Core**: `packages/core/src/`
- **Backend**: `packages/backend/src/`
- **Frontend**: `packages/frontend/src/`
- **Backend tests**: `packages/backend/test/`
- **Frontend tests**: `packages/frontend/test/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization, package scaffolding, tooling

- [x] T001 Create pnpm workspace config in `pnpm-workspace.yaml` with `packages/*` glob
- [x] T002 Create root `package.json` with workspace scripts, Turborepo, and shared dev deps (TypeScript 5, Vitest, ESLint, Prettier)
- [x] T003 Create `turbo.json` with build, test, lint, dev pipelines
- [x] T004 [P] Create `tsconfig.base.json` with strict TS config, path mapping for `@componode/*`
- [x] T005 [P] Create `packages/core/package.json` (name: `@componode/core`, zero runtime deps, Zod as devDep for schema types)
- [x] T006 [P] Create `packages/core/tsconfig.json` extending base
- [x] T007 [P] Create `packages/backend/package.json` (name: `@componode/backend`, deps: fastify, kysely, pg, @node-rs/argon2, pino, prom-client, @opentelemetry/api, @fastify/helmet, @fastify/static, zod, @componode/core)
- [x] T008 [P] Create `packages/backend/tsconfig.json` extending base
- [x] T009 [P] Create `packages/frontend/package.json` (name: `@componode/frontend`, deps: react, react-dom, react-router-dom, @tanstack/react-query, tailwindcss, @tailwindcss/vite, class-variance-authority, clsx, tailwind-merge, lucide-react, @radix-ui/react-slot, @componode/core)
- [x] T010 [P] Create `packages/frontend/tsconfig.json` and `tsconfig.app.json` extending base with `@/*` path alias
- [x] T011 [P] Create `packages/frontend/vite.config.ts` with React plugin, Tailwind v4 plugin, `@` path alias, API proxy to `localhost:3000`
- [x] T012 Create ESLint config in `eslint.config.js` with `no-restricted-imports` rule enforcing package boundaries (importers MUST NOT import `@componode/backend`) per ADR-065
- [x] T013 [P] Create `docker-compose.yml` with `postgres` service (PostgreSQL 16, init-db.sql mount) and `app` service (builds backend, serves frontend static)
- [x] T014 [P] Create `init-db.sql` for least-privilege DB user (CREATE ROLE componode WITH LOGIN PASSWORD, CREATE DATABASE componode, GRANT) per ADR-101
- [x] T015 [P] Create `.env.example` with all required env vars (DATABASE_URL, DATABASE_SSL_MODE, MAX_DB_CONNECTIONS, BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD, PORT, NODE_ENV, LOG_LEVEL, COOKIE_SECRET, CSRF_SECRET, CORS_ALLOWED_ORIGINS)
- [x] T016 [P] Create `.gitignore` with node_modules, dist, .env, .turbo, coverage

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core contracts, DB schema, Fastify skeleton with all plugins, frontend scaffold. MUST be complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Contracts (packages/core)

- [x] T017 [P] Create `packages/core/src/constants/roles.ts` with `ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const`, `Role` union type, `ROLE_META` map per ADR-079
- [x] T018 [P] Create `packages/core/src/constants/component-categories.ts` with 24 values, `ComponentCategory` type, `COMPONENT_CATEGORY_META` per ADR-013/079
- [x] T019 [P] Create `packages/core/src/constants/component-providers.ts` with providers + `OTHER`, `ComponentProvider` type, `COMPONENT_PROVIDER_META` per ADR-013/079
- [x] T020 [P] Create `packages/core/src/constants/environments.ts` with `ENVIRONMENTS = ["DEV", "TEST", "STAGING", "DEMO", "PRODUCTION", "OTHER"] as const` per ADR-077
- [x] T021 [P] Create `packages/core/src/constants/lifecycle.ts` with `COMPONENT_LIFECYCLE = ["ACTIVE", "RETIRED"] as const`
- [x] T022 [P] Create `packages/core/src/constants/instance-status.ts` with `INSTANCE_STATUS = ["RUNNING", "STOPPED", "ERROR", "GONE"] as const`
- [x] T023 [P] Create `packages/core/src/constants/product-types.ts` with `PRODUCT_TYPES = ["BUSINESS_CAPABILITY", "PLATFORM", "CUSTOMER_FACING"] as const`
- [x] T024 [P] Create `packages/core/src/constants/relationship-types.ts` with `RELATIONSHIP_TYPES` (COMPOSES, CONSUMES_FROM, DEPENDS_ON, SOURCES_FROM, EXPOSES, HAS_INSTANCE, OWNS, BELONGS_TO)
- [x] T025 [P] Create `packages/core/src/constants/import-run-status.ts` with `IMPORT_RUN_STATUS = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED", "INTERRUPTED"] as const`
- [x] T026 [P] Create `packages/core/src/constants/error-codes.ts` with `ERROR_CODES` array (AUTH_INVALID_CREDENTIALS, AUTH_RATE_LIMITED, AUTH_NO_SESSION, AUTH_FORBIDDEN, AUTH_USERNAME_TAKEN, AUTH_RESET_TOKEN_INVALID, AUTH_RESET_TOKEN_EXPIRED, AUTH_RESET_TOKEN_USED, OIDC_NOT_CONFIGURED, OIDC_INVALID_STATE, OIDC_INVALID_CODE, OIDC_TOKEN_VERIFICATION_FAILED, OIDC_DISCOVERY_FAILED, VALIDATION_FAILED, NOT_FOUND, INTERNAL_ERROR) and `ErrorCode` union per ADR-071
- [x] T027 Create `packages/core/src/constants/index.ts` re-exporting all constants
- [x] T028 [P] Create `packages/core/src/contracts/person.ts` with `Person` type (id, username, passwordHash?, oidcSubject?, role, displayName?, email?, teamId?, slug, isActive, createdAt, updatedAt) per ADR-033
- [x] T029 [P] Create `packages/core/src/contracts/session.ts` with `Session` type (id as string, userId, createdAt, lastSeenAt, expiresAt, revokedAt?) per ADR-043/099
- [x] T030 [P] Create `packages/core/src/contracts/component.ts` with `Component` type per data-model.md
- [x] T031 [P] Create `packages/core/src/contracts/component-instance.ts` with `ComponentInstance` type per data-model.md
- [x] T032 [P] Create `packages/core/src/contracts/component-group.ts` with `ComponentGroup` type per data-model.md
- [x] T033 [P] Create `packages/core/src/contracts/digital-product.ts` with `DigitalProduct` type per data-model.md
- [x] T034 [P] Create `packages/core/src/contracts/line-of-business.ts` with `LineOfBusiness` type
- [x] T035 [P] Create `packages/core/src/contracts/team.ts` with `Team` type
- [x] T036 [P] Create `packages/core/src/contracts/importer-config.ts` with `ImporterConfig` type
- [x] T037 [P] Create `packages/core/src/contracts/import-run.ts` with `ImportRun` and `ImportRunError` types
- [x] T038 [P] Create `packages/core/src/contracts/oidc-config.ts` with `OidcConfig` type per ADR-073
- [x] T039 [P] Create `packages/core/src/contracts/app-settings.ts` with `AppSettings` type (allowSelfRegistration, sessionIdleTimeoutMs, sessionAbsoluteTimeoutMs, defaultUserRole) per ADR-076
- [x] T040 [P] Create `packages/core/src/contracts/password-reset-token.ts` with `PasswordResetToken` type per ADR-099
- [x] T041 [P] Create `packages/core/src/contracts/audit.ts` with `EntityChange` and `EdgeChange` types per ADR-052/100
- [x] T042 [P] Create `packages/core/src/contracts/discovered-asset.ts` with `DiscoveredAsset` type (the importer contract — fields: category, provider, resourceType, name, externalId, environments[], details?, relationships?) per ADR-024
- [x] T043 [P] Create `packages/core/src/contracts/importer.ts` with `Importer` interface (`run(config, secretResolver): AsyncGenerator<DiscoveredAsset>`) and `ImporterContext` (logger, tracer) per ADR-025/067
- [x] T044 [P] Create `packages/core/src/observability/logger.ts` with `Logger` interface (debug, info, warn, error, child) per ADR-067
- [x] T045 [P] Create `packages/core/src/observability/tracer.ts` with `Tracer` interface (startSpan, withSpan) per ADR-068
- [x] T046 Create `packages/core/src/observability/index.ts` re-exporting Logger and Tracer
- [x] T047 [P] Create `packages/core/src/schemas/auth.ts` with Zod schemas: `loginSchema` (username 3-50 lowercase, password 8-128), `registerSchema`, `passwordChangeSchema`, `passwordResetConfirmSchema` per ADR-095
- [x] T048 [P] Create `packages/core/src/schemas/user.ts` with Zod schemas: `createUserSchema`, `updateUserSchema` per ADR-095
- [x] T049 [P] Create `packages/core/src/schemas/settings.ts` with Zod schemas: `updateSettingsSchema`, `updateOidcConfigSchema` per ADR-095
- [x] T050 Create `packages/core/src/schemas/index.ts` re-exporting all schemas
- [x] T051 [P] Create `packages/core/src/validation/discovered-asset.ts` with `validateDiscoveredAsset()` function using Zod (the importer harness per ADR-064) — deferred to 002 but contract defined here
- [x] T052 Create `packages/core/src/index.ts` re-exporting all contracts, constants, schemas, observability, validation

### Backend DB & Migrations

- [x] T053 Create `packages/backend/src/db/check-constraint-helper.ts` with helper that imports core constants and generates CHECK constraint SQL (e.g. `CHECK (category IN ('COMPUTE', ...))`) per ADR-078
- [x] T054 Create `packages/backend/src/db/types.ts` with Kysely `DB` interface type mapping all 24 tables to their row types per ADR-077
- [x] T055 Create `packages/backend/src/db/connection.ts` with Kysely instance factory (pg Pool, PostgresDialect, pool config from env, SSL config from DATABASE_SSL_MODE) per ADR-101, research.md R1
- [x] T056 Create `packages/backend/src/db/migrations/001_initial_schema.ts` with Kysely schema-builder creating all 24 tables with columns, FKs, CHECK constraints (from core constants via helper), unique constraints, and indexes per data-model.md
- [x] T057 Create `packages/backend/src/db/migrations/002_append_only_triggers.ts` creating `BEFORE UPDATE OR DELETE` triggers on `entity_changes`, `edge_changes`, `import_run_errors` that raise exceptions per ADR-100
- [x] T058 Create `packages/backend/src/db/migrations/003_terminal_state_triggers.ts` creating `BEFORE UPDATE` trigger on `import_runs` that raises if `OLD.status` is terminal per ADR-100

### Backend Fastify Skeleton & Plugins

- [x] T059 Create `packages/backend/src/utils/argon2.ts` with `hashPassword(plain)` and `verifyPassword(plain, hash)` using `@node-rs/argon2` (Argon2id) per ADR-099
- [x] T060 [P] Create `packages/backend/src/utils/crypto.ts` with `generateSessionToken()` (32-byte base64url), `generateResetToken()` (32-byte base64url), `hashToken(token)` (SHA-256) per ADR-099
- [x] T061 [P] Create `packages/backend/src/utils/secret-resolver.ts` with `SecretResolver` interface and `EnvSecretResolver` implementation (resolves `env:VAR_NAME` refs) per ADR-055
- [x] T062 Create `packages/backend/src/plugins/error-handler.ts` with Fastify error handler plugin that maps errors to `{code, message, details?}` format, never leaks stack traces (gated by DEBUG_ERROR_DETAILS env var) per ADR-071/096
- [x] T063 [P] Create `packages/backend/src/plugins/logging.ts` with Pino logger config (structured JSON, redact paths from research.md R7, request ID, log level from env) per ADR-090
- [x] T064 [P] Create `packages/backend/src/plugins/helmet.ts` with @fastify/helmet config (X-Content-Type-Options, X-Frame-Options DENY, CSP, Referrer-Policy, Permissions-Policy, HSTS in production) per ADR-089
- [x] T065 [P] Create `packages/backend/src/plugins/rate-limit.ts` with @fastify/rate-limit config (300 req/min general, 5 req/min for login per username, 3 req/min for register per IP) per ADR-097
- [x] T066 [P] Create `packages/backend/src/plugins/cors.ts` with CORS plugin (opt-in, parse CORS_ALLOWED_ORIGINS as exact-origin allow-list, default disabled) per ADR-088
- [x] T067 [P] Create `packages/backend/src/plugins/csrf.ts` with double-submit cookie CSRF plugin (sets componode_csrf cookie on auth responses, preHandler on POST/PUT/PATCH/DELETE comparing cookie to X-CSRF-Token header) per ADR-087, research.md R6
- [x] T068 Create `packages/backend/src/plugins/session.ts` with session auth preHandler (reads componode_session cookie, loads session by ID from DB, checks revokedAt + expiresAt + idle timeout, attaches user to request, updates lastSeenAt throttled to 60s) per ADR-043
- [x] T069 Create `packages/backend/src/plugins/rbac.ts` with RBAC default-deny preHandler (checks request.user.role against a permission map per route, denies with 403 AUTH_FORBIDDEN if insufficient) per ADR-053/054
- [x] T070 [P] Create `packages/backend/src/plugins/metrics.ts` with prom-client setup (default metrics + http_requests_total counter + http_request_duration_seconds histogram + auth_events_total counter + db_pool gauges + db_query_duration histogram + rate_limit_events_total counter) per ADR-069, research.md R8
- [x] T071 [P] Create `packages/backend/src/plugins/tracing.ts` with OpenTelemetry setup (trace provider, Fastify instrumentation, DB query spans) per ADR-068
- [x] T072 Create `packages/backend/src/app.ts` with Fastify app factory (registers all plugins, trust-proxy config, body limit 1MB, routes registration) per ADR-093/095
- [x] T073 Create `packages/backend/src/server.ts` with server bootstrap (run migrations on boot, create bootstrap admin if DB empty, listen on PORT)

### Frontend Scaffold

- [x] T074 Create `packages/frontend/src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge) per research.md R3
- [x] T075 [P] Create `packages/frontend/components.json` with shadcn/ui config (rsc: false, Vite mode, aliases) per research.md R3
- [x] T076 [P] Create `packages/frontend/src/index.css` with Tailwind v4 import and shadcn/ui CSS variables (neutral base color) per research.md R3
- [x] T077 [P] Create `packages/frontend/src/components/safe-url.ts` with `safeUrl()` utility (validates URL protocol is http/https, returns undefined for invalid) per ADR-085
- [x] T078 [P] Create `packages/frontend/src/components/external-link.tsx` with ExternalLink component (renders `<a>` with `rel="noopener noreferrer"`, `target="_blank"`) per ADR-085
- [x] T079 Create `packages/frontend/src/api/client.ts` with fetch wrapper (base path `/api/v1`, CSRF header from cookie, credential include, JSON parse, error handling) per ADR-070
- [x] T080 Create `packages/frontend/src/routes.tsx` with React Router config (public routes: /login, /register, /auth/oidc/callback; protected routes: /, /products, /components, /importers, /settings, /settings/users) per research.md R10
- [x] T081 Create `packages/frontend/src/components/layout/auth-guard.tsx` with AuthGuard component (calls GET /api/v1/auth/session, redirects to /login if 401, renders children if 200) per research.md R10
- [x] T082 Create `packages/frontend/src/app.tsx` with root component (QueryClientProvider, RouterProvider, Toaster)
- [x] T083 Create `packages/frontend/src/main.tsx` with Vite entry (ReactDOM render)

### Foundational Tests

- [x] T084 [P] Write unit test for `check-constraint-helper.ts` in `packages/backend/test/unit/check-constraint-helper.test.ts` verifying CHECK SQL generation from core constants
- [x] T085 [P] Write unit test for `argon2.ts` in `packages/backend/test/unit/argon2.test.ts` verifying hash and verify round-trip
- [x] T086 [P] Write unit test for `crypto.ts` in `packages/backend/test/unit/crypto.test.ts` verifying 32-byte token generation and SHA-256 hashing
- [x] T087 [P] Write unit test for `safe-url.ts` in `packages/frontend/test/unit/safe-url.test.ts` verifying valid/invalid URL filtering
- [x] T088 Write integration test for migrations in `packages/backend/test/integration/migrations.test.ts` (testcontainers Postgres, run all migrations, verify all 24 tables exist, verify CHECK constraints, verify append-only triggers raise on update/delete) per ADR-029/100
- [x] T089 Create `packages/backend/test/helpers/testcontainers.ts` with testcontainers Postgres setup helper (start container, return Kysely instance with migrated schema) per ADR-029
- [x] T090 Create `packages/backend/test/helpers/fixtures.ts` with test fixtures (fake credentials, test user factory, test session factory)

**Checkpoint**: Foundation ready — core contracts, DB schema, Fastify plugin pipeline, frontend scaffold all in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Deploy and Bootstrap (Priority: P1) 🎯 MVP

**Goal**: Deploy Componode via Docker Compose, migrations run, bootstrap admin created, admin logs in, sees empty dashboard with navigation.

**Independent Test**: Run Docker Compose against fresh Postgres → migrations create all tables → login as bootstrap admin → dashboard renders with empty-state navigation to Products, Components, Importers, Settings.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T091 [P] [US1] Write integration test for bootstrap in `packages/backend/test/integration/bootstrap.test.ts` — fresh DB + BOOTSTRAP_ADMIN_PASSWORD env var → admin user created with Argon2id hash, role ADMIN; second boot (non-empty DB) → bootstrap skipped
- [x] T092 [P] [US1] Write integration test for login flow in `packages/backend/test/integration/auth.test.ts` — POST /api/v1/auth/login with valid creds → 200 + session cookie + CSRF cookie; wrong password → 401 AUTH_INVALID_CREDENTIALS; non-existent user → 401
- [x] T093 [P] [US1] Write integration test for session check in `packages/backend/test/integration/auth.test.ts` — GET /api/v1/auth/session with valid cookie → 200 + user; no cookie → 401 AUTH_NO_SESSION; expired session → 401
- [x] T094 [P] [US1] Write integration test for logout in `packages/backend/test/integration/auth.test.ts` — POST /api/v1/auth/logout → 204 + cookie cleared; subsequent GET /api/v1/auth/session → 401
- [x] T095 [P] [US1] Write integration test for health check in `packages/backend/test/integration/health.test.ts` — GET /api/v1/health with session → 200 + status healthy + database connected

### Implementation for User Story 1

- [x] T096 [US1] Implement bootstrap service in `packages/backend/src/services/bootstrap-service.ts` (check if persons table is empty, read BOOTSTRAP_ADMIN_USERNAME/PASSWORD from env, create admin with Argon2id hash, role ADMIN, slug from username) per ADR-066
- [x] T097 [US1] Implement session service in `packages/backend/src/services/session-service.ts` (createSession: generate 32-byte token, insert with expiresAt = now + 12h; verifySession: load by ID, check revokedAt + expiresAt + idle timeout, update lastSeenAt throttled; revokeSession: set revokedAt; revokeUserSessions: set revokedAt WHERE userId) per ADR-043/099
- [x] T098 [US1] Implement auth service in `packages/backend/src/services/auth-service.ts` (login: find user by username, verify Argon2id, create session; logout: revoke session) per ADR-027
- [x] T099 [US1] Implement auth routes in `packages/backend/src/routes/auth.ts` — POST /auth/login (validate with loginSchema, rate-limited 5/min, set cookies), POST /auth/logout (revoke session, clear cookies), GET /auth/session (return current user) per contracts/auth-api.md
- [x] T100 [US1] Implement health route in `packages/backend/src/routes/health.ts` — GET /health (check DB connectivity, return status + uptime + version) per contracts/health-api.md
- [x] T101 [US1] Register auth and health routes in `packages/backend/src/app.ts`
- [x] T102 [P] [US1] Add shadcn/ui Button component via `npx shadcn@latest add button` to `packages/frontend/src/components/ui/button.tsx`
- [x] T103 [P] [US1] Add shadcn/ui Input component via `npx shadcn@latest add input` to `packages/frontend/src/components/ui/input.tsx`
- [x] T104 [P] [US1] Add shadcn/ui Label component via `npx shadcn@latest add label` to `packages/frontend/src/components/ui/label.tsx`
- [x] T105 [P] [US1] Add shadcn/ui Card component via `npx shadcn@latest add card` to `packages/frontend/src/components/ui/card.tsx`
- [x] T106 [US1] Create login page in `packages/frontend/src/pages/login.tsx` (username/password form, submit to POST /api/v1/auth/login, redirect to / on success, error display for 401/429, WCAG 2.1 AA: labeled inputs, keyboard nav, focus management) per FR-026
- [x] T107 [US1] Create dashboard page in `packages/frontend/src/pages/dashboard.tsx` (navigation cards to Products, Components, Importers, Settings, welcome message with user name)
- [x] T108 [P] [US1] Create empty products page in `packages/frontend/src/pages/products.tsx` (empty-state message: "No products yet. Products will appear here after you create them.")
- [x] T109 [P] [US1] Create empty components page in `packages/frontend/src/pages/components.tsx` (empty-state message: "No components yet. Components will appear here after an importer runs.")
- [x] T110 [P] [US1] Create empty importers page in `packages/frontend/src/pages/importers.tsx` (empty-state message: "No importers configured yet. Configure an importer to start importing components.")
- [x] T111 [US1] Create nav layout component in `packages/frontend/src/components/layout/nav.tsx` (sidebar or top nav with links to dashboard sections, user info, logout button) per research.md R10
- [x] T112 [US1] Create API hooks for auth in `packages/frontend/src/api/hooks/auth.ts` (useLogin, useLogout, useSession TanStack Query hooks) per research.md R10
- [x] T113 [US1] Wire routes in `packages/frontend/src/routes.tsx` — login (public), dashboard + products + components + importers (protected via AuthGuard)

**Checkpoint**: User Story 1 complete — can deploy, log in as bootstrap admin, see empty dashboard. This is the MVP.

---

## Phase 4: User Story 2 - Manage Users and Roles (Priority: P2)

**Goal**: Admin creates users with roles (Admin/Editor/Viewer), users log in with role-appropriate permissions, RBAC enforced on all routes.

**Independent Test**: Create Editor and Viewer users → log in as each → verify role-restricted actions are denied with 403 AUTH_FORBIDDEN.

### Tests for User Story 2

- [x] T114 [P] [US2] Write integration test for user CRUD in `packages/backend/test/integration/users.test.ts` — admin creates user (POST /api/v1/users → 201), lists users (GET /api/v1/users → 200 + array), updates role (PATCH /api/v1/users/:id → 200), duplicate username → 409
- [x] T115 [P] [US2] Write integration test for RBAC enforcement in `packages/backend/test/integration/rbac.test.ts` — Viewer POST /api/v1/users → 403; Editor POST /api/v1/users → 403; Admin POST /api/v1/users → 201; Viewer GET /api/v1/users → 403; Admin GET /api/v1/users → 200; role change takes effect on next request

### Implementation for User Story 2

- [x] T116 [US2] Implement user service in `packages/backend/src/services/user-service.ts` (createUser: validate username uniqueness, hash password, generate slug, insert; listUsers: with search/role/isActive filters; getUserById; updateUser: role/displayName/email/teamId/isActive; generateSlug from username) per contracts/user-api.md
- [x] T117 [US2] Implement user routes in `packages/backend/src/routes/users.ts` — GET /users (admin), GET /users/me (all), GET /users/:id (admin), POST /users (admin), PATCH /users/:id (admin), GET /users/:id/sessions (admin) per contracts/user-api.md
- [x] T118 [US2] Register user routes in `packages/backend/src/app.ts` with RBAC preHandler (admin-only for list/create/update, all-authenticated for /me)
- [x] T119 [P] [US2] Add shadcn/ui Table component via `npx shadcn@latest add table` to `packages/frontend/src/components/ui/table.tsx`
- [x] T120 [P] [US2] Add shadcn/ui Dialog component via `npx shadcn@latest add dialog` to `packages/frontend/src/components/ui/dialog.tsx`
- [x] T121 [P] [US2] Add shadcn/ui Select component via `npx shadcn@latest add select` to `packages/frontend/src/components/ui/select.tsx`
- [x] T122 [US2] Create users management page in `packages/frontend/src/pages/users.tsx` (user table with username, role, status; create user dialog; edit role dialog; admin-only access) per FR-008, WCAG 2.1 AA
- [x] T123 [US2] Create API hooks for users in `packages/frontend/src/api/hooks/users.ts` (useUsers, useCreateUser, useUpdateUser TanStack Query hooks)
- [x] T124 [US2] Add users route to `packages/frontend/src/routes.tsx` (protected, admin-only via role check in AuthGuard or route element)

**Checkpoint**: User Stories 1 AND 2 both work independently. Admin can manage users, RBAC enforced.

---

## Phase 5: User Story 3 - Configure OIDC Authentication (Priority: P3)

**Goal**: Deployer configures OIDC via settings UI, users log in via external IdP, JIT provisioning creates accounts with Viewer role, claim-based role mapping works.

**Independent Test**: Configure mock OIDC provider → click "Login with OIDC" → complete IdP auth → redirected back to dashboard → user created with Viewer role.

### Tests for User Story 3

- [x] T125 [P] [US3] Write integration test for OIDC flow in `packages/backend/test/integration/oidc.test.ts` — configure OIDC (PUT /api/v1/settings/oidc), initiate login (POST /auth/oidc/login → 302 to IdP), callback with mock code+state (GET /auth/oidc/callback → 302 to dashboard, session created), JIT provisioning (new oidcSubject → user created with Viewer role), claim-based role mapping (matching claim → mapped role), local admin override (existing user → local role preserved)
- [x] T126 [P] [US3] Write integration test for OIDC error cases in `packages/backend/test/integration/oidc.test.ts` — invalid state → 400 OIDC_INVALID_STATE, OIDC disabled → 503 OIDC_NOT_CONFIGURED, invalid code → 400 OIDC_INVALID_CODE

### Implementation for User Story 3

- [x] T127 [US3] Implement settings service in `packages/backend/src/services/settings-service.ts` (getSettings: read from app_settings table with env var fallback + typed defaults; updateSettings: validate with updateSettingsSchema, write to DB; getOidcConfig: read from oidc_config table; updateOidcConfig: validate with updateOidcConfigSchema, test issuer discovery, write to DB) per ADR-076, contracts/settings-api.md
- [x] T128 [US3] Implement OIDC service in `packages/backend/src/services/oidc-service.ts` (initiateLogin: generate state + PKCE S256, store state in session, return IdP redirect URL; handleCallback: exchange code for tokens via openid-client, verify ID token, extract oidcSubject + claims, JIT provision or find user, apply role mapping with local override, create session) per ADR-027/073, research.md R2
- [x] T129 [US3] Implement settings routes in `packages/backend/src/routes/settings.ts` — GET /settings (admin), PATCH /settings (admin), GET /settings/oidc (admin), PUT /settings/oidc (admin) per contracts/settings-api.md
- [x] T130 [US3] Implement OIDC routes in `packages/backend/src/routes/auth.ts` — POST /auth/oidc/login (redirect to IdP), GET /auth/oidc/callback (handle callback, create session, redirect) per contracts/auth-api.md
- [x] T131 [US3] Register settings and OIDC routes in `packages/backend/src/app.ts`
- [x] T132 [P] [US3] Add shadcn/ui Form component via `npx shadcn@latest add form` to `packages/frontend/src/components/ui/form.tsx`
- [x] T133 [P] [US3] Add shadcn/ui Switch component via `npx shadcn@latest add switch` to `packages/frontend/src/components/ui/switch.tsx`
- [x] T134 [US3] Create settings page in `packages/frontend/src/pages/settings.tsx` (app settings section: self-registration toggle, session timeout inputs; OIDC config section: enable toggle, issuer, clientId, clientSecretRef, role claim path, claim value field, role mapping editor) per FR-009, WCAG 2.1 AA
- [x] T135 [US3] Add "Login with OIDC" button to `packages/frontend/src/pages/login.tsx` (conditionally rendered if OIDC is enabled — check via GET /api/v1/settings/oidc public endpoint or a public status flag)
- [x] T136 [US3] Create OIDC callback page in `packages/frontend/src/pages/oidc-callback.tsx` (handles redirect from IdP, shows loading state, redirects to dashboard on success)
- [x] T137 [US3] Create API hooks for settings in `packages/frontend/src/api/hooks/settings.ts` (useSettings, useUpdateSettings, useOidcConfig, useUpdateOidcConfig TanStack Query hooks)
- [x] T138 [US3] Add settings route to `packages/frontend/src/routes.tsx` (protected, admin-only)

**Checkpoint**: User Stories 1, 2, AND 3 all work independently. OIDC authentication is configurable and functional.

---

## Phase 6: User Story 4 - Session Management and Security (Priority: P4)

**Goal**: Sessions persist, expire (4h idle / 12h absolute), can be revoked. Login rate-limited. CSRF protection on state-changing routes. Security headers on all responses. Password change and reset flows work.

**Independent Test**: Log in → session persists across navigations → log out → session revoked. 6th login attempt in 1 min → 429. POST without CSRF token → 403. Admin views and revokes other users' sessions. Password change and reset work.

### Tests for User Story 4

- [x] T139 [P] [US4] Write integration test for session management in `packages/backend/test/integration/sessions.test.ts` — session persists across requests, logout revokes session, admin lists all sessions (GET /api/v1/users/:id/sessions → 200), admin revokes session (POST /api/v1/sessions/:id/revoke → 204), revoked session → 401 on next request
- [x] T140 [P] [US4] Write integration test for rate limiting in `packages/backend/test/integration/rate-limit.test.ts` — 5 failed logins → 401, 6th → 429 AUTH_RATE_LIMITED + Retry-After header; 4th registration from same IP → 429
- [x] T141 [P] [US4] Write integration test for CSRF in `packages/backend/test/integration/csrf.test.ts` — POST without X-CSRF-Token header → 403; POST with matching cookie+header → success; POST with mismatched → 403
- [x] T142 [P] [US4] Write integration test for password change in `packages/backend/test/integration/password.test.ts` — POST /auth/password/change with correct current password → 204; wrong current password → 401; new password < 8 chars → 422
- [x] T143 [P] [US4] Write integration test for password reset in `packages/backend/test/integration/password.test.ts` — admin generates reset token (POST /auth/password/reset → 200 + token), user resets (POST /auth/password/reset/confirm → 204), reused token → 400 AUTH_RESET_TOKEN_USED, expired token → 400 AUTH_RESET_TOKEN_EXPIRED

### Implementation for User Story 4

- [x] T144 [US4] Implement password reset service in `packages/backend/src/services/password-reset-service.ts` (generateResetToken: create 32-byte token, hash with SHA-256, insert with 15min expiry, return plaintext; confirmReset: find by tokenHash, check not expired + not used, hash new password, update user, mark token used) per ADR-099, research.md R5
- [x] T145 [US4] Implement session routes in `packages/backend/src/routes/sessions.ts` — GET /sessions (list current user's sessions), POST /sessions/:id/revoke (revoke a session, admin can revoke any, users can revoke own) per contracts/user-api.md
- [x] T146 [US4] Add password change and reset routes to `packages/backend/src/routes/auth.ts` — POST /auth/password/change (all authenticated), POST /auth/password/reset (admin only), POST /auth/password/reset/confirm (public) per contracts/auth-api.md
- [x] T147 [US4] Register session routes in `packages/backend/src/app.ts` with RBAC (admin can list/revoke any, users can list/revoke own)
- [x] T148 [P] [US4] Add shadcn/ui Badge component via `npx shadcn@latest add badge` to `packages/frontend/src/components/ui/badge.tsx`
- [x] T149 [US4] Create sessions management page in `packages/frontend/src/pages/sessions.tsx` (list active sessions with created/lastSeen/expires, revoke button, admin sees all users' sessions) per FR-019
- [x] T150 [US4] Create password change form in `packages/frontend/src/pages/settings.tsx` or a profile page (current password, new password, confirm new password, submit to POST /auth/password/change) per FR-018
- [x] T151 [US4] Create API hooks for sessions and password in `packages/frontend/src/api/hooks/sessions.ts` and `packages/frontend/src/api/hooks/password.ts`
- [x] T152 [US4] Add sessions route to `packages/frontend/src/routes.tsx` (protected, admin sees all, users see own)

**Checkpoint**: User Stories 1-4 all work independently. Full session management, security hardening, password flows operational.

---

## Phase 7: User Story 5 - Observability Foundation (Priority: P5)

**Goal**: Every request and auth event logged as structured JSON with redaction. Metrics endpoint exposes 5+ metric families in Prometheus format. Tracing infrastructure in place.

**Independent Test**: Make requests → verify structured JSON logs with no secrets → scrape /metrics → verify 5+ metric families present.

### Tests for User Story 5

- [x] T153 [P] [US5] Write integration test for metrics endpoint in `packages/backend/test/integration/metrics.test.ts` — GET /metrics → 200 + text/plain Prometheus format; verify http_requests_total, http_request_duration_seconds, auth_events_total, db_pool_size, rate_limit_events_total metrics present after making requests
- [x] T154 [P] [US5] Write unit test for log redaction in `packages/backend/test/unit/logging.test.ts` — create Pino logger with redact config, log an object with password/sessionToken/authorization fields, verify output contains [REDACTED] not the actual values

### Implementation for User Story 5

- [x] T155 [US5] Implement metrics route in `packages/backend/src/routes/metrics.ts` — GET /metrics (unauthenticated, returns prom-client register metrics in Prometheus text format) per contracts/health-api.md, ADR-069
- [x] T156 [US5] Register metrics route in `packages/backend/src/app.ts` (outside auth/RBAC preHandler, network-policy-restricted)
- [x] T157 [US5] Instrument auth events in `packages/backend/src/services/auth-service.ts` — increment auth_events_total counter on login success/failure, logout
- [x] T158 [US5] Instrument DB queries in `packages/backend/src/db/connection.ts` — wrap Kysely with query duration histogram (db_query_duration_seconds, operation label)
- [x] T159 [US5] Add OpenTelemetry span for HTTP requests in `packages/backend/src/plugins/tracing.ts` — root span per request, child span for DB queries, child span for auth
- [x] T160 [US5] Verify Pino redaction filter is active in production code paths in `packages/backend/src/plugins/logging.ts` — ensure redact paths from research.md R7 are configured, test with a debug log containing sensitive fields

**Checkpoint**: All 5 user stories complete. Observability infrastructure fully operational.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility audit, Docker Compose finalization, documentation, final validation

- [x] T161 [P] Audit all frontend pages for WCAG 2.1 Level AA conformance in `packages/frontend/src/pages/` — verify keyboard navigation on every interactive element, form labels, color contrast 4.5:1, focus indicators, ARIA attributes per FR-026/SC-012
- [x] T162 [P] Add shadcn/ui Toaster component via `npx shadcn@latest add sonner` to `packages/frontend/src/components/ui/sonner.tsx` for error/success notifications
- [x] T163 Finalize `docker-compose.yml` — app service builds backend + frontend (multi-stage Dockerfile: build frontend with Vite, copy dist to backend static dir), env vars wired, depends_on postgres, healthcheck
- [x] T164 [P] Create `Dockerfile` in repo root (multi-stage: Stage 1 build frontend with Vite, Stage 2 build backend with tsc, Stage 3 runtime: copy backend dist + frontend dist, run `node dist/server.js`)
- [x] T165 [P] Verify `.env.example` has all required vars with placeholder values and comments explaining each
- [x] T166 Run all quickstart.md validation scenarios (1-10) against the running system and verify each passes per quickstart.md
- [x] T167 [P] Create `packages/frontend/src/pages/not-found.tsx` (404 page for unknown routes)
- [x] T168 [P] Add error boundary in `packages/frontend/src/app.tsx` (catches render errors, shows error message with retry button)
- [x] T169 Verify all 19 secure development rules (ADR-084–102) are satisfied: no sql.raw(), no dangerouslySetInnerHTML, security headers present, CSRF enforced, rate limiting active, no secrets in logs, parameterized queries, TLS config, input validation on all routes, error responses sanitized, password hashing with Argon2id, session tokens crypto-random, audit triggers in place

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1) is the MVP — complete first
  - US2 (P2) depends on US1 (needs auth + session from US1)
  - US3 (P3) depends on US1 (needs auth + session from US1)
  - US4 (P4) depends on US1 (needs session infrastructure from US1)
  - US5 (P5) depends on US1 (needs running server with requests to instrument)
  - US2, US3, US4, US5 can proceed in parallel after US1 (if team capacity allows)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational. No dependencies on other stories. 🎯 MVP
- **US2 (P2)**: Depends on US1 (auth + session). Independently testable after US1.
- **US3 (P3)**: Depends on US1 (auth + session). Independently testable after US1.
- **US4 (P4)**: Depends on US1 (session service). Independently testable after US1.
- **US5 (P5)**: Depends on US1 (running server). Independently testable after US1.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle VI)
- Services before routes
- Backend before frontend (frontend needs API to exist)
- shadcn/ui components can be added in parallel ([P] tasks)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T004-T016)
- All core contract tasks marked [P] can run in parallel (T017-T051)
- All Fastify plugin tasks marked [P] can run in parallel (T063-T071)
- All frontend component tasks marked [P] can run in parallel
- All test tasks within a user story marked [P] can run in parallel
- After US1 completes, US2/US3/US4/US5 can be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Integration test for bootstrap in packages/backend/test/integration/bootstrap.test.ts"
Task: "Integration test for login flow in packages/backend/test/integration/auth.test.ts"
Task: "Integration test for session check in packages/backend/test/integration/auth.test.ts"
Task: "Integration test for logout in packages/backend/test/integration/auth.test.ts"
Task: "Integration test for health check in packages/backend/test/integration/health.test.ts"

# Launch all shadcn/ui component additions in parallel:
Task: "Add Button component to packages/frontend/src/components/ui/button.tsx"
Task: "Add Input component to packages/frontend/src/components/ui/input.tsx"
Task: "Add Label component to packages/frontend/src/components/ui/label.tsx"
Task: "Add Card component to packages/frontend/src/components/ui/card.tsx"

# Launch empty pages in parallel:
Task: "Create empty products page in packages/frontend/src/pages/products.tsx"
Task: "Create empty components page in packages/frontend/src/pages/components.tsx"
Task: "Create empty importers page in packages/frontend/src/pages/importers.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T016)
2. Complete Phase 2: Foundational (T017-T090) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T091-T113)
4. **STOP and VALIDATE**: Run quickstart scenarios 1-2 (deploy + login + dashboard)
5. Deploy/demo if ready — this is the MVP milestone

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP! "deploy, log in, see empty dashboard")
3. Add US2 → Test independently → Deploy/Demo ("manage users and roles")
4. Add US3 → Test independently → Deploy/Demo ("configure OIDC")
5. Add US4 → Test independently → Deploy/Demo ("session management and security")
6. Add US5 → Test independently → Deploy/Demo ("observability foundation")
7. Polish → Final validation → Release

### Parallel Team Strategy

With multiple developers after US1:

1. Team completes Setup + Foundational + US1 together
2. Once US1 is done:
   - Developer A: US2 (user management)
   - Developer B: US3 (OIDC)
   - Developer C: US4 (session management + security)
   - Developer D: US5 (observability)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after US1
- Tests MUST fail before implementation (Constitution Principle VI — non-negotiable)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All 19 secure development rules (ADR-084–102) are binding — verify in Polish phase
- WCAG 2.1 Level AA (FR-026) is binding — verify in Polish phase
