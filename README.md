# Componode

**Open-source, self-hosted Digital Product Asset Management (DPAM).**

Componode lets you model your **Digital Products** — applications, solutions,
platforms — as compositions of building-block **Components** imported from
repository tools, cloud environments, container orchestrators, and web/API/MCP
endpoints. A digital product can compose other digital products, and products
depend on components.

The canonical architecture is the **Composable Product Model**: Lines of
Business own Business Capability Products that compose shared Platform
Products. Importers pull the factual layer (what exists); humans curate the
meaning layer (what it means).

## What Componode is

- A **single-organization** self-hosted tool. One deployment = one org/team.
  No multi-tenancy.
- An **importer-first** tool: the headline value is importing assets from
  GitHub, AWS, Azure, Kubernetes, Docker, and web/API/MCP endpoints.
- A **catalog** of digital products and their composition hierarchy, curated
  by humans, enriched by importers.
- A **self-hostable** monolith: Fastify backend, React/Vite frontend,
  PostgreSQL database, deployed via Docker Compose.

## What Componode is not

- Not a hosted SaaS (single-org only; a hosted offering is a future open-core
  possibility, not v1).
- Not multi-tenant (no `Organization`/tenant layer).
- Not a security scanner (risk scoring and ASPM integration are deferred to a
  later phase).

## Current status

The project is in active v1 development. The following capabilities are
implemented and tested:

- **Foundation**: shared `packages/core` contracts, a 24-table PostgreSQL schema
  with Kysely migrations, Fastify backend with local/OIDC auth, RBAC, CSRF,
  rate limiting, security headers, logging, metrics, and tracing; React/Vite
  frontend with auth, dashboard, and shadcn/ui components.
- **Importer framework**: scheduler, registry, import-run reconciliation, and the
  pull-only `AsyncGenerator<DiscoveredAsset>` contract.
- **Component catalog**: components and component groups (CRUD, listing,
  search/filter, pagination), lifecycle/operational-state defaults
  (`RETIRED`/`GONE` exclusion), and quickstart integration.
- **Importers**: GitHub, AWS, Azure, Kubernetes, Web URL, API URL, and MCP Server
  packages, all validating yielded assets through `validateDiscoveredAsset`.
- **Testing**: Vitest unit tests and testcontainer-backed integration tests,
  including catalog API and frontend table performance checks.

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | TypeScript 5, Fastify, Kysely (query builder), `pg` |
| Frontend | React 18, Vite, TanStack Query, React Router, Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL 14+ (CHECK constraints from `core` constants; no native ENUMs) |
| Migrations | Kysely built-in migration system |
| Monorepo | pnpm workspaces + Turborepo |
| Importer framework | In-tree packages, pull-only `AsyncGenerator<DiscoveredAsset>` |
| Auth | Built-in local (Argon2id via `@node-rs/argon2`, server-side sessions) + optional OIDC via `openid-client` |
| Observability | Pino (logging) + Prometheus (`prom-client`) + OpenTelemetry (`@opentelemetry/api`) |
| Deployment | Docker Compose (one container: backend serves frontend static) |
| Identifiers | UUID v7 (application-side generation) and URL-safe slugs |
| CI/CD | GitHub Actions + changesets (planned) |
| License | Apache 2.0 |

## Repository Structure

```text
packages/
├── core/                           # Shared contracts (zero runtime deps)
│   ├── src/contracts/              # DiscoveredAsset, Importer, entity types
│   ├── src/constants/              # 24 component categories, 10 providers,
│   │                               # roles, environments, lifecycle, etc.
│   ├── src/schemas/                # Zod validation schemas
│   ├── src/observability/          # Logger and Tracer interfaces
│   └── src/validation/             # validateDiscoveredAsset harness
├── backend/                        # Fastify API + Kysely services
│   ├── src/db/migrations/          # 001_initial_schema, 002_append_only_triggers,
│   │                               # 003_terminal_state_triggers
│   ├── src/plugins/                # helmet, cors, csrf, rate-limit, session,
│   │                               # rbac, logging, metrics, tracing
│   ├── src/routes/                 # auth, users, sessions, settings, health, metrics
│   ├── src/services/               # auth, user, session, oidc, password-reset,
│   │                               # settings, bootstrap
│   └── test/                       # unit and integration (testcontainers) tests
└── frontend/                       # React/Vite dashboard
    ├── src/pages/                  # login, register, dashboard, products,
    │                               # components, importers, settings, sessions,
    │                               # users, oidc-callback, not-found
    ├── src/components/ui/          # shadcn/ui components
    ├── src/components/layout/      # auth-guard, nav
    └── src/api/                    # fetch client + TanStack Query hooks
researches/                         # Architecture Decision Records (ADRs)
├── architecture-decisions.md       # ADR index
├── component_taxonomy_research.md  # Taxonomy grounding research
└── adrs/                           # Individual ADR files
specs/                              # spec-kit feature specifications
└── 001-foundation/                 # spec.md, plan.md, tasks.md, contracts/
.specify/                           # spec-kit infrastructure
.devin/                             # Devin skills
```

## Core Concepts

- **Digital Product**: A logical product (application, platform, capability)
  composed of components and other products. Has a type
  (`BUSINESS_CAPABILITY`, `PLATFORM`, `CUSTOMER_FACING`) and lifecycle
  (`ACTIVE`/`RETIRED`).
- **Component**: A building-block asset with a two-level taxonomy:
  - `category`: one of 24 controlled values (`COMPUTE`, `STORAGE`, `DATABASE`,
    `CONTAINER`, `CONTAINER_ORCHESTRATION`, `API_GATEWAY`, `WEB_APP`, etc.)
  - `provider`: one of 10 controlled values (`GITHUB`, `AWS`, `AZURE`,
    `GOOGLE_CLOUD`, `KUBERNETES`, `DOCKER`, `WEB`, `API`, `MCP`, `OTHER`)
  - `resourceType`: free-form string carrying the provider-native type (e.g.
    `ec2:instance`, `apps/v1:Deployment`, `Microsoft.Compute/virtualMachines`)
- **Component Instance**: An environment-specific deployment of a component.
  One component can have instances across `DEV`, `TEST`, `STAGING`, `DEMO`,
  `PRODUCTION`, and `OTHER`.
- **Component Group**: A human-declared equivalence across distinct source
  assets (e.g. three EC2 instances in three accounts considered the same
  logical component).
- **Importer**: A pull-only `AsyncGenerator<DiscoveredAsset>` that reads from
  an external source and yields normalized assets. Importers never touch the
  database — `packages/core` owns upsert, dedup, reconciliation, and run
  history.
- **DiscoveredAsset**: The importer contract — a normalized asset record with
  category, provider, resourceType, name, externalId, environments (with
  url/region/status/version), and a details bag. `relationships[]` is **not**
  part of the v1 contract; importer-declared product edges are a v2 feature.

## API Surface (foundation)

Authenticated routes require a `componode_session` cookie and the appropriate
role. State-changing routes require a matching `componode_csrf` cookie and
`x-csrf-token` header.

| Route | Description | Auth/Role |
|---|---|---|
| `POST /api/v1/auth/login` | Local username/password login | Public |
| `POST /api/v1/auth/register` | Self-registration (if enabled) | Public, rate-limited |
| `POST /api/v1/auth/logout` | Revoke current session | Any authenticated |
| `GET /api/v1/auth/session` | Current user info | Any authenticated |
| `POST /api/v1/auth/password/change` | Change own password | Any authenticated |
| `POST /api/v1/auth/password/reset` | Admin generates reset token | Admin |
| `POST /api/v1/auth/password/reset/confirm` | Confirm reset with token | Public |
| `GET /api/v1/auth/oidc/status` | OIDC enabled status | Public |
| `POST /api/v1/auth/oidc/login` | Initiate OIDC login (PKCE) | Public |
| `GET /api/v1/auth/oidc/callback` | OIDC callback (JIT provisioning) | Public |
| `GET /api/v1/users` | List users | Admin |
| `GET /api/v1/users/me` | Current user | Any authenticated |
| `GET /api/v1/users/:id` | Get user by ID | Admin |
| `POST /api/v1/users` | Create user | Admin |
| `PATCH /api/v1/users/:id` | Update user role | Admin |
| `GET /api/v1/sessions` | List all active sessions | Admin |
| `GET /api/v1/users/:id/sessions` | List sessions for a user | Admin |
| `POST /api/v1/sessions/:id/revoke` | Revoke a session | Admin |
| `GET /api/v1/settings` | Read app settings | Admin |
| `PATCH /api/v1/settings` | Update app settings | Admin |
| `GET /api/v1/settings/oidc` | Read OIDC config | Admin |
| `PUT /api/v1/settings/oidc` | Update OIDC config (tests issuer discovery) | Admin |
| `GET /api/v1/health` | Health + database connectivity | Any authenticated |
| `GET /api/v1/metrics` | Prometheus metrics | Unauthenticated (network restricted) |

## Architecture Principles

Componode is governed by seven constitution principles recorded in
`.specify/memory/constitution.md`:

1. **Single-Organization, Self-Hosted** — one deployment = one org. No
   multi-tenancy.
2. **Importer-First** — importers are pull-only generators that never touch
   the DB. `packages/core` owns upsert, dedup, and reconciliation.
3. **Two-Level Taxonomy** — components are classified by controlled `category`
   + controlled `provider` + free-form `resourceType`, not a flat single enum.
4. **Environment-as-Instance** — one component has many `ComponentInstance`
   records across environments, not an `environment` field on the component.
5. **Factual vs. Meaning Layer** — importers populate what exists; humans
   curate what it means. Importer-declared product edges are a v2 feature.
6. **Test-First** — tests are written before implementation. Integration tests
   with testcontainers cover all DB-touching code.
7. **Observability from Day One** — structured logging, Prometheus metrics,
   and OpenTelemetry tracing are in the foundation, not retrofitted.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose (for PostgreSQL)

### Development

```bash
git clone https://github.com/estevanalex/componode.git
cd componode
pnpm install
cp .env.example .env
```

Edit `.env` — set `BOOTSTRAP_ADMIN_PASSWORD` (must be 8+ chars) and generate a
`COOKIE_SECRET`:

```bash
openssl rand -base64 32
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

This starts a PostgreSQL 16 container with `init-db.sql`, which creates the
`componode` database and a least-privilege user.

Start the backend (runs migrations and bootstrap on first boot):

```bash
pnpm --filter @componode/backend dev
```

In a separate terminal, start the frontend:

```bash
pnpm --filter @componode/frontend dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to
`http://localhost:3000`. Log in with the bootstrap admin credentials from
`.env` and you will see the empty dashboard.

### Docker Compose (full stack)

```bash
docker compose up -d
```

The app is available at `http://localhost:3000`. The backend serves the built
frontend static assets in this mode. Migrations run automatically on first
boot, and a bootstrap admin is created from the `BOOTSTRAP_ADMIN_*`
environment variables.

## Development

### Commands

```bash
pnpm build          # Build all packages (Turborepo)
pnpm dev            # Start dev servers for all packages
pnpm test           # Run all tests
pnpm test:unit      # Run unit tests only
pnpm test:integration  # Run integration tests (requires Docker)
pnpm lint           # Lint all packages
pnpm typecheck      # Typecheck all packages
pnpm db:migrate     # Run database migrations
```

Per-package commands:

```bash
pnpm --filter @componode/backend test:integration  # Docker required
pnpm --filter @componode/frontend test             # jsdom-based
```

### Spec-Driven Development

This project uses spec-kit v0.12.11 for structured feature development. The
workflow is command-driven via `.devin/skills/speckit-*`:

1. `/speckit-constitution` — establish project principles
2. `/speckit-specify` — create feature branch and write `spec.md`
3. `/speckit-clarify` — resolve ambiguity
4. `/speckit-plan` — produce `plan.md`, `research.md`, `data-model.md`, `contracts/`
5. `/speckit-tasks` — generate `tasks.md`
6. `/speckit-implement` — execute tasks
7. `/speckit-checklist` — generate checklists
8. `/speckit-analyze` — cross-artifact consistency check
9. `/speckit-converge` — assess codebase vs spec

See `.specify/memory/constitution.md` for the full constitution and
`researches/architecture-decisions.md` for the ADR index.

## Roadmap

v1 is split into 6 spec-kit features with an explicit dependency graph:

1. **`001-foundation`** ✅ — core contracts, DB schema, backend skeleton,
   auth, RBAC, observability, empty dashboard. (Complete)
2. **`002-importer-framework`** — run service, scheduler, registry,
   reconciliation, cancellation, observability for runs.
3. **`003-component-catalog`** — component/instance services + UI, the 7 v1
   importers.
4. **`004-product-hierarchy`** — products, edges, ownership, Platform Product
   workflow, hierarchy UI.
5. **`005-audit-and-settings`** — audit tables, settings, admin UI.
6. **`006-deployment-and-docs`** — Docker Compose packaging, CI, changesets,
   docs.

Dependencies: 001 → 002 → 003 + 004 (overlap) → 005 + 006.

## License

Apache 2.0
