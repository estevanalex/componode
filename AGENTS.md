# AGENTS.md — Project Context for AI Coding Agents

> **Last updated**: 2026-09-04 (AGENTS.md review — trimmed to boundaries and references)
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
endpoints.

The canonical architecture is the **Composable Product Model**: Lines of
Business own Business Capability Products that compose shared Platform Products,
and every product depends on Components.

### What Componode is

- A **single-organization** self-hosted tool (no multi-tenancy).
- An **importer-first** catalog: the headline value is importing assets from
  GitHub, AWS, Azure, Kubernetes, web/API/MCP endpoints.
- A human-curated catalog of digital products and their composition hierarchy,
  enriched by importers.

### What Componode is not

- Not a hosted SaaS (single-org only; hosted offering is a future open-core
  possibility, not v1).
- Not multi-tenant (no `Organization`/tenant layer).
- Not a security scanner (Risk entity and ASPM integration are deferred to a
  later phase).

### Foundational documents (read these first)

| Document | Role |
|---|---|
| `.specify/memory/constitution.md` | **7 binding principles that govern every spec** |
| `researches/architecture-decisions.md` | **ADR index — 102 ratified decisions** |
| `researches/adrs/ADR-XXX-*.md` | **Individual ADRs for every rule in this file** |
| `specs/{NNN-feature-name}/spec.md` | **Feature specifications (authoritative for current work)** |
| `specs/{NNN-feature-name}/plan.md` | **Implementation plan for the current feature** |
| `specs/{NNN-feature-name}/tasks.md` | **Executable tasks for the current feature** |

Never implement from `.devin/plans`, one-off notes, or temporary locations.
Always implement from the generated `tasks.md` artifact under `specs/`.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | TypeScript 5, Fastify, Kysely |
| Frontend | React 18, Vite, TanStack Query, React Router, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (CHECK constraints from `core` constants; no native ENUMs) |
| Migrations | Kysely built-in migration system (TS, schema-builder) |
| Monorepo | pnpm workspaces + Turborepo |
| Importer framework | In-tree packages, pull-only `AsyncGenerator<DiscoveredAsset>` |
| Auth | Built-in local (Argon2id + server-side sessions) + optional OIDC |
| Observability | Pino (logging) + Prometheus (metrics) + OpenTelemetry (tracing) |
| Deployment | Docker Compose (one container: backend serves frontend static) |
| CI/CD | GitHub Actions + changesets |
| License | Apache 2.0 |
| Identifiers | UUID v7 for entities; `slug` for human-readable refs |
| API versioning | `/api/v1/...` prefix on all routes |

For the full stack rationale, see `.specify/memory/constitution.md` § Additional
Constraints and the relevant ADRs.

---

## Project Structure

```text
.
├── .devin/
│   └── skills/                    # spec-kit skills (speckit-*)
├── .specify/                      # spec-kit infrastructure
│   ├── memory/constitution.md     # Project constitution
│   └── workflows/                 # Workflow registry
├── packages/                      # pnpm workspace packages
│   ├── core/                      # Shared contracts and types
│   ├── backend/                   # Fastify API + Kysely services
│   ├── frontend/                  # React/Vite dashboard
│   ├── importer-api-url/
│   ├── importer-aws/
│   ├── importer-azure/
│   ├── importer-github/
│   ├── importer-kubernetes/
│   ├── importer-mcp-server/
│   └── importer-web-url/
├── researches/                    # Architecture research and decisions
│   ├── architecture-decisions.md  # ADR index
│   └── adrs/                      # 102 individual ADR files
├── specs/                         # DYNAMIC — created per feature
│   └── {NNN-feature-name}/        # spec.md, plan.md, tasks.md, ...
├── docs/
│   ├── importer-development.md    # Importer contributor contract
│   ├── data-model.md              # Schema, entities, relationships
│   └── deployment.md              # Docker Compose self-hosting
├── docker-compose.yml
├── AGENTS.md                      # This file
└── README.md
```

---

## Agent Boundaries & Non-Negotiables

These are the constraints every implementation must respect. They are not
detailed design documents; for detail, read the linked ADRs and the
constitution.

### Identity & data

- Use **UUID v7** for new entity records; pass the ID as a SQL parameter. See
  `ADR-045`.
- `DigitalProduct`, `Component`, `ComponentInstance`, `ComponentGroup`,
  `Person`, `Team`, and `LineOfBusiness` MUST have a unique `slug`. See
  `ADR-046`.
- No `Organization` or tenant layer. No multi-tenancy. See `constitution.md` I.

### Importer contract

- Importers are **pull-only** `AsyncGenerator<DiscoveredAsset>` and never touch
  the database. See `ADR-056`, `ADR-057`.
- Importer packages depend only on `packages/core`. They MUST NOT import from
  `packages/backend` or from other importers. See `ADR-065`.
- The core owns upsert, dedup, reconciliation, and run history. See
  `ADR-035`, `ADR-036`, `ADR-037`, `ADR-038`.

### Environment & lifecycle

- Environment is modeled as `ComponentInstance`, not a field on `Component`. See
  `ADR-014`, `ADR-034`.
- `Component.lifecycle` (`ACTIVE`/`RETIRED`) is the logical lifecycle;
  `ComponentInstance.status` (`RUNNING`/`STOPPED`/`ERROR`/`GONE`) is the
  operational state. Do not conflate them. See `constitution.md` IV.
- Default list/tree/dashboard queries exclude `RETIRED` records and `GONE`
  instances unless the caller explicitly requests them.

### Graph & hierarchy

- `COMPOSES` (product → product) is a DAG. Cycle detection returns `409 CYCLE`
  to the client. See `ADR-049`, `ADR-050`.
- `CONSUMES_FROM` target must be `PLATFORM`; `COMPOSES` parent must be
  `BUSINESS_CAPABILITY` or `CUSTOMER_FACING`. See `ADR-018`.
- 1-to-many relationships are foreign keys; many-to-many are typed junction
  tables. No polymorphic `edges` table. See `ADR-048`.

### Package dependencies

- `packages/core` is a leaf with zero `@componode/*` deps.
- `packages/backend` depends on `core` + all 7 importer packages (manifest
  import only).
- `packages/frontend` depends on `core` for types and calls the backend over
  HTTP. See `ADR-065`.

### Security (read ADR-084 through ADR-102 for full rules)

- No `sql.raw()` or `sql.fragment()` in application code; Kysely parameterized
  queries only. See `ADR-084`.
- No `dangerouslySetInnerHTML` in v1; validate all URL `href`s with `safeUrl()`.
  See `ADR-085`.
- No secrets, credentials, or sensitive config in logs or commits. See
  `ADR-090`, `ADR-091`.
- `GET`/`HEAD` routes must be side-effect-free on domain state. See `ADR-094`.
- Validate all inputs with Zod at the route boundary; reject unknown fields.
  See `ADR-095`.
- Error responses must not leak stack traces, SQL, or internal paths. See
  `ADR-096`.
- All API routes are authenticated except public auth routes and `/metrics`. See
  `ADR-054`, `ADR-097`.
- Session IDs are cryptographically random, not UUID v7. See `ADR-099`.

### API & errors

- All routes under `/api/v1/...`. See `ADR-070`.
- Error responses: `{code, message, details?}`. Codes are controlled enums in
  `packages/core`. See `ADR-071`.

### Testing

- Test-first is non-negotiable: failing test → implement → refactor. See
  `constitution.md` VI.
- `validateDiscoveredAsset` in `packages/core` is the enforceable importer
  contract. Every importer unit test MUST exercise it.

---

## Spec-Kit Workflow

All feature work MUST follow the spec-kit workflow. The authoritative commands
and sequences are `.specify/memory/constitution.md` § Spec-Driven Development
Workflow and `.specify/workflows/workflow-registry.json`.

Required sequence for a feature:

1. `speckit-specify` — produce `specs/{NNN-feature-name}/spec.md`.
2. `speckit-plan` — produce `specs/{NNN-feature-name}/plan.md` (and optional
   `data-model.md`, `research.md`, `contracts/`, `quickstart.md`).
3. `speckit-tasks` — produce `specs/{NNN-feature-name}/tasks.md`.
4. `speckit-implement` — execute `tasks.md` phase by phase.
5. `speckit-analyze` / `speckit-converge` — before merge.

Branch naming is determined by `.specify/init-options.json`
(`feature_numbering: sequential`). When a valid `speckit-specify` command is
issued, the agent MUST work on the designated feature branch and never on `main`
or an unrelated branch.

---

## What AGENTS.md Is

- A **starting map** for the project.
- A **guardrail list** of the most important non-negotiables.
- A **signpost** to the authoritative documents (constitution, ADRs, specs).

## What AGENTS.md Is NOT

- **Not the spec.** Authoritative feature requirements live in
  `specs/{NNN-feature-name}/`.
- **Not the architecture record.** Ratified decisions live in
  `researches/architecture-decisions.md` and `researches/adrs/`.
- **Not the constitution.** The 7 binding principles live in
  `.specify/memory/constitution.md`.
- **Not a security checklist.** The full 19 secure-development rules are in
  `ADR-084` through `ADR-102`.

If this file conflicts with an ADR, the constitution, or an active `specs/`
artifact, the more specific document wins.

---

## Key References

| Document | When to read it |
|---|---|
| `.specify/memory/constitution.md` | Before writing or reviewing any spec |
| `researches/architecture-decisions.md` | Before any implementation |
| `researches/adrs/ADR-XXX-*.md` | When the ADR index or `AGENTS.md` boundary points you to one |
| `specs/{NNN-feature-name}/spec.md` | When starting a feature |
| `specs/{NNN-feature-name}/plan.md` | Before `speckit-tasks` for that feature |
| `specs/{NNN-feature-name}/tasks.md` | During `speckit-implement` |
| `docs/importer-development.md` | When building or editing an importer |
| `docs/data-model.md` | When changing schema or entities |
| `docs/deployment.md` | When changing Docker Compose or deployment |
