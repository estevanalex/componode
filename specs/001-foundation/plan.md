# Implementation Plan: Foundation

**Branch**: `001-foundation` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-foundation/spec.md`

## Summary

The foundation spec delivers the irreducible core of Componode: shared
contracts in `packages/core`, the full 28-table database schema with
migrations, a Fastify backend skeleton with auth (local + OIDC), RBAC,
sessions, security hardening (CSRF, rate limiting, security headers),
structured logging/metrics/tracing, and an empty dashboard frontend. The
milestone is: deploy Componode, log in, see an empty dashboard.

## Technical Context

**Language/Version**: TypeScript 5 (backend + frontend + core + importers)

**Primary Dependencies**:
- Backend: Fastify, Kysely, `@node-rs/argon2`, `@fastify/helmet`,
  `@fastify/rate-limit` (or equivalent), `@fastify/static`, `pino`,
  `@opentelemetry/api`, `prom-client`
- Frontend: React 18, Vite, TanStack Query, React Router, Tailwind CSS,
  shadcn/ui (Radix primitives)
- Core: zero runtime deps (type definitions, constants, validation
  schemas only); Zod for schema definitions
- Database: PostgreSQL 14+ via Kysely (driver choice: `pg` or `postgres`
  per ADR-077 — resolved in research.md)
- Monorepo: pnpm workspaces + Turborepo

**Storage**: PostgreSQL 14+ (24 tables per ADR-077, Kysely migrations,
CHECK constraints from `core` constants, append-only triggers on audit
tables)

**Testing**: Vitest (unit + integration), testcontainers-postgres for
DB-touching integration tests (ADR-029), `validateDiscoveredAsset` harness
in `core` for importer contract validation (deferred to 002)

**Target Platform**: Linux server (Docker Compose: `postgres` + `app`
container). Dev on Windows/macOS/Linux via Vite dev server + local or
Docker Postgres.

**Project Type**: Web service (Fastify backend serving React frontend
static assets in production; Vite dev server with API proxy in dev)

**Performance Goals**: 95th percentile under 500ms for read endpoints,
under 1s for write endpoints, under 50 concurrent users (SC-011). Boot
under 30s including migrations (SC-010).

**Constraints**:
- Single-instance deployment (ADR-065, ADR-028)
- 28-table schema with append-only triggers (ADR-077, ADR-100)
- 19 secure development rules binding (ADR-084–102)
- WCAG 2.1 Level AA for frontend (FR-026)
- No `sql.raw()` in application code (ADR-084)
- No `dangerouslySetInnerHTML` in v1 (ADR-085)
- No `fs`/`process.env`/`child_process`/`eval` in importer packages
  (ADR-098 — enforced via ESLint, but importer packages are deferred to
  002/003)

**Scale/Scope**: Up to 50 concurrent users, single-org deployment, 10
DB connections (MAX_DB_CONNECTIONS default), 300 req/min per user
(rate limit), 1MB max request body.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Single-Organization | ✅ Pass | No `Organization` entity, no tenant columns, no multi-tenancy. RBAC is org-global. |
| II. Importer-First | ✅ Pass (deferred) | Importer packages are NOT built in 001-foundation (deferred to 002/003). The `Importer` interface and `DiscoveredAsset` contract ARE defined in `core` as part of the foundation — they're the contracts that 002 builds on. No importer writes to the DB in this spec. |
| III. Two-Level Taxonomy | ✅ Pass | `COMPONENT_CATEGORIES`, `COMPONENT_PROVIDERS` constants defined in `core` (ADR-079). CHECK constraints generated from these in migrations (ADR-078). No flat single-enum. |
| IV. Environment-as-Instance | ✅ Pass | Schema includes `components` + `component_instances` as separate tables (ADR-077). No `environment` column on `components`. `ComponentGroup` table included. |
| V. Factual vs. Meaning Layer | ✅ Pass | No importer-declared product edges in this spec. `DiscoveredAsset` contract does not include `COMPOSES`/`CONSUMES_FROM`/`OWNS` edges. Product hierarchy tables exist in schema but are empty (populated by 004). |
| VI. Test-First | ✅ Pass | Integration tests with testcontainers for all DB-touching code. Unit tests for auth, RBAC, session, validation logic. Tests written before implementation per TDD. |
| VII. Observability from Day One | ✅ Pass | Pino structured logging with redaction filter, Prometheus metrics endpoint, OpenTelemetry tracing — all in the foundation request pipeline before business logic. |

**Gate Result**: PASS — no violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth-api.md      # Login, logout, session, OIDC callback
│   ├── user-api.md      # User CRUD, role management
│   ├── settings-api.md  # App settings, OIDC config
│   └── health-api.md    # Health check, metrics
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── core/                          # Shared contracts (leaf — zero deps on @componode/*)
│   ├── src/
│   │   ├── contracts/             # DiscoveredAsset, Importer interface, entity types
│   │   │   ├── discovered-asset.ts
│   │   │   ├── importer.ts
│   │   │   ├── component.ts
│   │   │   ├── component-instance.ts
│   │   │   ├── component-group.ts
│   │   │   ├── digital-product.ts
│   │   │   ├── line-of-business.ts
│   │   │   ├── team.ts
│   │   │   ├── person.ts
│   │   │   ├── session.ts
│   │   │   ├── importer-config.ts
│   │   │   ├── import-run.ts
│   │   │   ├── oidc-config.ts
│   │   │   ├── app-settings.ts
│   │   │   ├── password-reset-token.ts
│   │   │   ├── audit.ts           # entity_changes, edge_changes
│   │   │   └── index.ts
│   │   ├── constants/             # Enum constants (ADR-079)
│   │   │   ├── component-categories.ts
│   │   │   ├── component-providers.ts
│   │   │   ├── environments.ts
│   │   │   ├── lifecycle.ts
│   │   │   ├── instance-status.ts
│   │   │   ├── product-types.ts
│   │   │   ├── relationship-types.ts
│   │   │   ├── roles.ts
│   │   │   ├── import-run-status.ts
│   │   │   ├── error-codes.ts     # Controlled error code enum (ADR-071)
│   │   │   └── index.ts
│   │   ├── schemas/               # Zod validation schemas (ADR-095)
│   │   │   ├── auth.ts            # Login, register, password reset
│   │   │   ├── user.ts            # User create/update
│   │   │   ├── settings.ts        # App settings, OIDC config
│   │   │   └── index.ts
│   │   ├── validation/            # validateDiscoveredAsset harness (ADR-064)
│   │   │   └── discovered-asset.ts
│   │   ├── observability/         # Logger + Tracer interfaces (ADR-067/068)
│   │   │   ├── logger.ts
│   │   │   ├── tracer.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                       # Fastify API + Kysely services
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrations/        # Kysely migrations (ADR-078)
│   │   │   │   ├── 001_initial_schema.ts   # All 24 tables
│   │   │   │   ├── 002_append_only_triggers.ts
│   │   │   │   └── 003_terminal_state_triggers.ts
│   │   │   ├── connection.ts      # Kysely instance, pool config (ADR-101)
│   │   │   ├── types.ts           # Kysely DB type (generated from schema)
│   │   │   └── check-constraint-helper.ts  # CHECK from core constants
│   │   ├── plugins/
│   │   │   ├── helmet.ts          # Security headers (ADR-089)
│   │   │   ├── rate-limit.ts      # Rate limiting (ADR-097)
│   │   │   ├── cors.ts            # CORS opt-in (ADR-088)
│   │   │   ├── csrf.ts            # Double-submit cookie (ADR-087)
│   │   │   ├── session.ts         # Session auth preHandler
│   │   │   ├── rbac.ts            # RBAC default-deny preHandler (ADR-053)
│   │   │   ├── error-handler.ts   # Error response format (ADR-071/096)
│   │   │   ├── logging.ts         # Pino structured logging (ADR-090)
│   │   │   ├── metrics.ts         # Prometheus metrics (ADR-069)
│   │   │   └── tracing.ts         # OpenTelemetry tracing (ADR-068)
│   │   ├── routes/
│   │   │   ├── auth.ts            # Login, logout, register, password reset
│   │   │   ├── users.ts           # User CRUD, role management
│   │   │   ├── sessions.ts        # Session list, revoke
│   │   │   ├── settings.ts        # App settings, OIDC config
│   │   │   ├── health.ts          # Health check
│   │   │   └── metrics.ts         # Prometheus metrics endpoint
│   │   ├── services/
│   │   │   ├── auth-service.ts    # Login, password verify, session create
│   │   │   ├── user-service.ts    # User CRUD, role assignment
│   │   │   ├── session-service.ts # Session create, verify, revoke, list
│   │   │   ├── oidc-service.ts    # OIDC flow, JIT provisioning
│   │   │   ├── settings-service.ts # App settings read/write
│   │   │   ├── password-reset-service.ts
│   │   │   └── bootstrap-service.ts # First-boot admin creation
│   │   ├── utils/
│   │   │   ├── crypto.ts          # 32-byte random token generation
│   │   │   ├── argon2.ts          # Argon2id hash/verify wrapper
│   │   │   └── secret-resolver.ts # SecretResolver interface (ADR-055)
│   │   ├── app.ts                 # Fastify app factory (plugin registration)
│   │   └── server.ts              # Server bootstrap (migrations, listen)
│   ├── test/
│   │   ├── integration/
│   │   │   ├── auth.test.ts
│   │   │   ├── sessions.test.ts
│   │   │   ├── users.test.ts
│   │   │   ├── rbac.test.ts
│   │   │   ├── oidc.test.ts
│   │   │   ├── settings.test.ts
│   │   │   └── migrations.test.ts
│   │   ├── unit/
│   │   │   ├── argon2.test.ts
│   │   │   ├── crypto.test.ts
│   │   │   ├── password-reset.test.ts
│   │   │   └── check-constraint-helper.test.ts
│   │   └── helpers/
│   │       ├── testcontainers.ts  # Postgres testcontainer setup
│   │       └── fixtures.ts        # Test fixtures (fake credentials)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # React/Vite dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── dashboard.tsx      # Empty dashboard with nav
│   │   │   ├── products.tsx       # Empty state
│   │   │   ├── components.tsx     # Empty state
│   │   │   ├── importers.tsx      # Empty state
│   │   │   ├── settings.tsx       # Auth config, user management
│   │   │   └── users.tsx          # User management (admin)
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── external-link.tsx  # rel="noopener noreferrer" (ADR-085)
│   │   │   ├── safe-url.ts        # safeUrl() utility (ADR-085)
│   │   │   └── layout/
│   │   │       ├── nav.tsx
│   │   │       └── auth-guard.tsx
│   │   ├── api/
│   │   │   ├── client.ts          # Fetch wrapper, CSRF header, base path
│   │   │   └── hooks/             # TanStack Query hooks
│   │   ├── routes.tsx             # React Router config
│   │   ├── app.tsx                # Root component
│   │   └── main.tsx               # Vite entry
│   ├── test/
│   │   └── unit/
│   │       ├── safe-url.test.ts
│   │       └── external-link.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts             # API proxy config
│
└── [importer packages — deferred to 002/003]

# Repository root
├── docker-compose.yml             # postgres + app (with init-db.sql)
├── .env.example                   # Placeholder values
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                   # Root workspace
└── tsconfig.base.json             # Shared TS config
```

**Structure Decision**: pnpm monorepo with workspaces (ADR-012). `core`
is the leaf (zero deps on `@componode/*`). `backend` depends on `core`.
`frontend` depends on `core` (types only). One container in production
(backend serves frontend via `fastify-static` per ADR-065). Vite dev
server with API proxy in dev. Importer packages are deferred to
002/003 — their directory structure is documented in ADR-065 but not
created in this spec.

## Complexity Tracking

> No violations — table not needed.
