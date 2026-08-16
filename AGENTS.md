# AGENTS.md — Project Context for AI Coding Agents

> **Last updated**: 2026-08-16
> **Project**: Componode — open-source Digital Product Asset Management
> **License**: Apache 2.0
> **Repository**: https://github.com/estevanalex/componode
> **Primary language**: English (all documentation, specs, and comments)

---

## Project Overview

Componode is an **open-source, self-hosted Digital Product Asset Management
(DPAM)** tool. It lets users model their **Digital Products** (applications,
solutions) as compositions of building-block **Components** imported from
repository tools, cloud environments, container orchestrators, and web/API/MCP
endpoints. A digital product can compose other digital products, and products
depend on components.

The canonical architecture is the **Composable Product Model**, where Digital
Products are modular building blocks composed into hierarchies: Lines of
Business own Business Capability Products that compose shared Platform Products.

### What Componode is

- A **single-organization** self-hosted tool (no multi-tenancy). One deployment
  = one org/team.
- An **importer-first** tool: the headline value is importing assets from
  GitHub, AWS, Azure, Kubernetes, and web/API/MCP endpoints.
- A **catalog** of digital products and their composition hierarchy, curated by
  humans, enriched by importers.

### What Componode is not

- Not a hosted SaaS (single-org only; hosted offering is a future open-core
  possibility, not v1).
- Not multi-tenant (no `Organization`/tenant layer; tenant isolation rules from
  the prior DPAM project are deleted).
- Not a security scanner (Risk entity and ASPM integration are deferred to a
  later phase).

### Foundational decisions

All architectural decisions are recorded in
`researches/architecture-decisions.md` (32 ADRs from the 2026-08-16 grilling
session). **Read that file before starting any implementation work.** Changes
to any decision require a new grilling session or an explicit superseding ADR.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | TypeScript 5, Fastify, Kysely (query builder) |
| Frontend | React 18, Vite, TanStack Query, React Router, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL |
| Migrations | Kysely built-in migration system |
| Monorepo | pnpm workspaces + Turborepo |
| Importer framework | In-tree packages, pull-only `AsyncGenerator<DiscoveredAsset>` |
| Auth | Built-in local (username/password, server-side sessions) + optional OIDC |
| Observability | Pino (logging) + Prometheus (metrics) + OpenTelemetry (tracing) |
| Deployment | Docker Compose |
| CI/CD | GitHub Actions + changesets |
| License | Apache 2.0 |
| Version control | Git |
| OS environment | Windows (PowerShell scripts for spec-kit automation) |

---

## Project Structure

```text
.
├── .devin/
│   └── skills/                    # spec-kit skills (speckit-*)
├── .specify/                      # spec-kit infrastructure
│   ├── scripts/powershell/        # spec-kit PowerShell scripts
│   ├── templates/                 # spec/plan/tasks/constitution templates
│   ├── memory/constitution.md     # Project constitution
│   └── workflows/                 # Workflow registry
├── packages/                      # pnpm workspace packages
│   ├── core/                      # Shared contracts (DiscoveredAsset, Importer interface, types)
│   ├── backend/                   # Fastify API + Kysely services + scheduler
│   ├── frontend/                  # React/Vite dashboard
│   ├── importer-github/           # GitHub repository importer
│   ├── importer-aws/              # AWS cloud asset importer
│   ├── importer-azure/            # Azure cloud asset importer
│   ├── importer-kubernetes/       # Kubernetes workload/namespace importer
│   ├── importer-web-url/          # Web URL endpoint probe importer
│   ├── importer-api-url/          # API URL (OpenAPI/health) importer
│   └── importer-mcp-server/       # MCP server importer
├── researches/                    # Architecture research and decisions
│   ├── architecture-decisions.md  # 32 ADRs from the grilling session
│   └── component_taxonomy_research.md  # Industry survey grounding the taxonomy
├── specs/                         # DYNAMIC — created per feature by spec-kit
│   └── {NNN-feature-name}/
├── docs/                          # Contributor and user documentation
│   ├── importer-development.md    # The importer contributor contract
│   ├── data-model.md              # Schema, entities, relationships
│   └── deployment.md              # Docker Compose self-hosting
├── docker-compose.yml             # Full-stack local orchestration
├── AGENTS.md                      # This file
├── README.md                      # Project overview and setup
└── .gitignore
```

---

## Technical Rules and Guidance

These rules are binding for all runtime code. Violations are bugs, not style
preferences.

### Entity identifiers

- New entity records MUST use a time-sortable identifier (UUID v7 or ULID),
  not `randomUUID()`/UUID v4. Generate the ID application-side (e.g. the `ulid`
  or `uuidv7` npm package) and pass it into the SQL `INSERT` as a parameter.
- `DigitalProduct`, `Component`, and `ComponentInstance` MUST carry a unique
  `slug` (human-readable, stable, URL-safe), enforced by a PostgreSQL unique
  constraint, in addition to the `id` primary key. The `slug` is the
  user-facing reference; the `id` is not intended for URLs.

### Lifecycle vs operational state

- `Component.lifecycle` (`ACTIVE`/`RETIRED`) is the **lifecycle** field (is
  this still in scope for the platform). It is separate from
  `ComponentInstance.status` (`RUNNING`/`STOPPED`/`ERROR`), which is the
  **operational** state (is this currently running). Never conflate the two.
- `DigitalProduct` also has a `lifecycle` field (`ACTIVE`/`RETIRED`), separate
  from its `type` (`BUSINESS_CAPABILITY`/`PLATFORM`/`CUSTOMER_FACING`).
- Do not expand a two-state lifecycle into a richer state machine without a
  corresponding spec decision in the relevant `spec.md`.
- Default list/tree/dashboard queries MUST exclude `RETIRED` records unless an
  explicit filter parameter is passed by the caller.

### Component taxonomy (see researches/component_taxonomy_research.md)

- `Component.category` is a controlled enum of 24 values (see ADR-013). Do not
  add new categories without updating the taxonomy research and the enum.
- `Component.provider` is a controlled enum with an `OTHER` escape hatch. Do
  not add new providers without updating the enum.
- `Component.resourceType` is a free-form string carrying the provider-native
  type (e.g. `ec2:instance`, `Microsoft.Compute/virtualMachines`,
  `apps/v1:Deployment`). Importers MUST populate this from the source.
- The `CONTAINER` / `CONTAINER_ORCHESTRATION` split is intentional — it mirrors
  the Kubernetes API's workload-vs-scope distinction. Do not conflate them.

### Environment modeling

- Environment is modeled as a separate `ComponentInstance` entity, NOT a field
  on `Component`. One logical `Component` → many `ComponentInstance` records
  across environments (`DEV`/`TEST`/`STAGING`/`DEMO`/`PRODUCTION`/`OTHER`).
- A component that exists in dev + staging + prod is ONE component with THREE
  instances. Do not duplicate the component per environment.

### Graph relationship conventions (Composable Product Model)

- `COMPOSES` (parent product → child product), `CONSUMES_FROM` (consumer
  product → platform product), and `DEPENDS_ON` (product → component, or
  component → component) are the only relationship types used to build the
  product hierarchy and dependency graph.
- `SOURCES_FROM` (component → repository) is for code provenance, distinct
  from `DEPENDS_ON`.
- `EXPOSES` (component → API component) is for service-provides-API, distinct
  from `DEPENDS_ON`.
- `HAS_INSTANCE` (component → ComponentInstance) is for environment-specific
  deployments.
- Do not introduce a parallel or competing relationship type without updating
  `researches/architecture-decisions.md` first.

### Composition rules (enforced)

- `COMPOSES` parent MUST be `BUSINESS_CAPABILITY` or `CUSTOMER_FACING`.
- `CONSUMES_FROM` target MUST be `PLATFORM`.
- The Platform Product workflow (ADR-017) promotes a shared component to a
  platform product by: creating a `DigitalProduct` (type: PLATFORM), wiring
  `DEPENDS_ON` from it to the component, and rewriting the consumers'
  `DEPENDS_ON` edges into `CONSUMES_FROM` edges.

### Importer contract (see ADR-024, ADR-025)

- Importers are in-tree packages under `packages/importer-<provider>/`,
  auto-discovered at boot. No runtime plugin loading.
- Importers implement `Importer.run(config, secretResolver):
  AsyncGenerator<DiscoveredAsset>` — pull-only, never touch the DB.
- The core owns upsert (by `(category, provider, externalId)`), dedup,
  `import_runs` history, and component/instance lifecycle.
- Importers resolve credentials via the `SecretResolver` interface (env / file
  resolvers in v1; Vault/AWS SM later). Importers MUST NOT store secrets.
- Importer packages MUST NOT import from `packages/backend` (enforced by ESLint
  boundary rules). They depend only on `packages/core`.

### Sessions and authentication

- Sessions MUST be revocable server-side (a session record checked on every
  authenticated request), not a bare stateless JWT.
- Login attempts MUST be rate-limited (5 failed attempts per minute per
  username or source IP → `429`).
- OIDC integration (optional): JIT provisioning on first login (default role:
  Viewer), claim-based role mapping with local admin override.

### Risk and scoring fields

- Do not add scoring-engine fields (EPSS, KEV, CARS, SSVC, loss-model) or a
  `Risk` entity speculatively "for later." Risk is deferred entirely from v1
  (ADR-021). Add each field in the implementation phase that actually consumes
  it.

---

## Spec-Driven Development Workflow

This project uses **spec-kit v0.12.11** for structured feature development.
The workflow is command-driven via spec-kit skills.

### Phase Flow

1. **`/speckit-constitution`** — Establish project principles (run once, first).
2. **`/speckit-specify`** — Create a feature branch and write `spec.md`.
3. **`/speckit-clarify`** (optional) — Resolve ambiguity via up to 5 questions.
4. **`/speckit-plan`** — Produce `plan.md`, `research.md`, `data-model.md`,
   `contracts/`, `quickstart.md`.
5. **`/speckit-tasks`** — Generate `tasks.md` organized by user story.
6. **`/speckit-implement`** — Execute tasks phase-by-phase.
7. **`/speckit-checklist`** — Generate requirements-quality checklists.
8. **`/speckit-analyze`** — Read-only cross-artifact consistency check.
9. **`/speckit-converge`** — Assess codebase vs spec, append remaining work.

### Branch Naming

- Sequential numbering (default): `001-feature-name`, `002-another-feature`
- Determined by `.specify/init-options.json` (`branch_numbering` field)
- Feature directories mirror branch names under `specs/`

---

## Key References

| Document | Role |
|---|---|
| `researches/architecture-decisions.md` | **32 ADRs from the grilling session — read before any implementation** |
| `researches/component_taxonomy_research.md` | **Industry survey grounding the 24-category taxonomy** |
| `.specify/memory/constitution.md` | Project constitution (to be filled via `/speckit-constitution`) |
