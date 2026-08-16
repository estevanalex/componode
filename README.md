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
  GitHub, AWS, Azure, Kubernetes, and web/API/MCP endpoints.
- A **catalog** of digital products and their composition hierarchy, curated
  by humans, enriched by importers.

## What Componode is not

- Not a hosted SaaS (single-org only; a hosted offering is a future open-core
  possibility, not v1).
- Not multi-tenant (no `Organization`/tenant layer).
- Not a security scanner (risk scoring and ASPM integration are deferred to a
  later phase).

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | TypeScript 5, Fastify, Kysely (query builder) |
| Frontend | React 18, Vite, TanStack Query, React Router, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL 14+ (CHECK constraints from core constants; no native ENUMs) |
| Migrations | Kysely built-in migration system |
| Monorepo | pnpm workspaces + Turborepo |
| Importer framework | In-tree packages, pull-only `AsyncGenerator<DiscoveredAsset>` |
| Auth | Built-in local (Argon2id, server-side sessions) + optional OIDC |
| Observability | Pino (logging) + Prometheus (metrics) + OpenTelemetry (tracing) |
| Deployment | Docker Compose (one container: backend serves frontend static) |
| CI/CD | GitHub Actions + changesets |
| License | Apache 2.0 |

## Repository Structure

```text
packages/
├── core/          # Shared contracts, constants, Zod schemas (zero runtime deps)
├── backend/       # Fastify API + Kysely services + auth + RBAC + observability
└── frontend/      # React/Vite dashboard with shadcn/ui
researches/        # Architecture decisions (ADRs) and taxonomy research
specs/             # Feature specifications (spec-kit workflow)
```

Importer packages (`importer-github`, `importer-aws`, `importer-azure`,
`importer-kubernetes`, `importer-web-url`, `importer-api-url`,
`importer-mcp-server`) are planned for subsequent features.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

### Development

```bash
git clone https://github.com/estevanalex/componode.git
cd componode
pnpm install
cp .env.example .env
```

Edit `.env` — set `BOOTSTRAP_ADMIN_PASSWORD` (must be 8+ chars) and generate a
`COOKIE_SECRET` (`openssl rand -base64 32`).

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the backend (runs migrations on boot, creates bootstrap admin):

```bash
pnpm --filter @componode/backend dev
```

In a separate terminal, start the frontend:

```bash
pnpm --filter @componode/frontend dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to
`http://localhost:3000`.

### Docker Compose (full stack)

```bash
docker compose up -d
```

The app is available at `http://localhost:3000`. Migrations run automatically
on first boot and a bootstrap admin is created from the `BOOTSTRAP_ADMIN_*`
environment variables.

## Core Concepts

- **Digital Product**: A logical product (application, platform, capability)
  composed of components and other products. Has a type (Business Capability,
  Platform, Customer-Facing) and lifecycle (Active/Retired).
- **Component**: A building-block asset with a two-level taxonomy: a controlled
  `category` enum (24 values) + a controlled `provider` enum (with `OTHER`
  escape hatch) + a free-form `resourceType` string.
- **Component Instance**: An environment-specific deployment of a component.
  One component can have instances across dev, staging, prod, etc.
- **Component Group**: A human-declared equivalence across distinct source
  assets (e.g. three EC2 instances in three accounts considered the same
  logical component).
- **Importer**: A pull-only `AsyncGenerator<DiscoveredAsset>` that reads from
  an external source and yields normalized assets. Importers never touch the
  database — the core owns upsert, dedup, reconciliation, and run history.
- **DiscoveredAsset**: The importer contract — a normalized asset record with
  category, provider, resourceType, name, externalId, environments, and
  optional relationships.

## Architecture Principles

Componode is governed by seven constitution principles:

1. **Single-Organization, Self-Hosted** — one deployment = one org. No
   multi-tenancy.
2. **Importer-First** — importers are pull-only generators that never touch the
   DB. The core owns upsert, dedup, and reconciliation.
3. **Two-Level Taxonomy** — components are classified by category + provider +
   free-form resourceType, not a flat single enum.
4. **Environment-as-Instance** — one component has many instances across
   environments, not an `environment` field on the component.
5. **Factual vs. Meaning Layer** — importers populate what exists; humans
   curate what it means. Importer-declared product edges are a v2 feature.
6. **Test-First** — tests are written before implementation. Integration tests
   with testcontainers cover all DB-touching code.
7. **Observability from Day One** — structured logging, Prometheus metrics,
   and OpenTelemetry tracing are in the foundation, not retrofitted.

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

### Spec-Driven Development

This project uses [spec-kit](https://github.com/speckit/speckit) for
structured feature development. Features are specified in `specs/` and follow
a constitution → specify → clarify → plan → tasks → implement → analyze →
converge workflow. See `.specify/memory/constitution.md` for the full
constitution and `researches/architecture-decisions.md` for the ADR index.

## License

Apache 2.0 — see [LICENSE](LICENSE).
