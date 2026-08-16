# AGENTS.md — Project Context for AI Coding Agents

> **Last updated**: 2026-08-16 (Session 2 grilling — 51 new ADRs, 7 constitution principles)
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
`researches/architecture-decisions.md` (**83 ADRs** from the 2026-08-16 grilling
sessions: ADR-001–032 from Session 1, ADR-033–083 from Session 2). **Read that
file before starting any implementation work.** The 7 constitution principles in
`.specify/memory/constitution.md` govern all specs — every spec is checked
against them. Changes to any decision require a new grilling session or an
explicit superseding ADR.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | TypeScript 5, Fastify, Kysely (query builder) |
| Frontend | React 18, Vite, TanStack Query, React Router, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (CHECK constraints from `core` constants; no native ENUMs — ADR-078) |
| Migrations | Kysely built-in migration system (TS, schema-builder — ADR-078) |
| Monorepo | pnpm workspaces + Turborepo |
| Importer framework | In-tree packages, pull-only `AsyncGenerator<DiscoveredAsset>` |
| Auth | Built-in local (Argon2id via `@node-rs/argon2`, server-side sessions — ADR-044) + optional OIDC (ADR-073) |
| Observability | Pino (logging) + Prometheus (metrics) + OpenTelemetry (tracing) |
| Deployment | Docker Compose (one container: backend serves frontend static — ADR-065) |
| CI/CD | GitHub Actions + changesets |
| License | Apache 2.0 |
| Version control | Git |
| Identifiers | UUID v7 (native Postgres `uuid`); `slug` for human-readable refs (ADR-045) |
| API versioning | `/api/v1/...` prefix on all routes (ADR-070) |
| Error format | `{code, message, details?}` with `code` enum in `core` (ADR-071) |
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
│   ├── architecture-decisions.md  # 83 ADRs from the grilling sessions
│   └── component_taxonomy_research.md  # Industry survey grounding the taxonomy
├── specs/                         # DYNAMIC — created per feature by spec-kit
│   └── {NNN-feature-name}/        # v1 split: 001-foundation → 002-importer-framework
│                                  #   → 003-component-catalog + 004-product-hierarchy
│                                  #   → 005-audit-and-settings + 006-deployment-and-docs
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

### Entity identifiers (ADR-045)

- New entity records MUST use **UUID v7** (not UUID v4/`randomUUID()`, not
  ULID). Generate the ID application-side (e.g. the `uuidv7` npm package) and
  pass it into the SQL `INSERT` as a parameter. Stored as native Postgres
  `uuid` (16 bytes).
- `DigitalProduct`, `Component`, `ComponentInstance`, `ComponentGroup`,
  `Person`, `Team`, and `LineOfBusiness` MUST carry a unique `slug`
  (human-readable, stable, URL-safe), enforced by a PostgreSQL unique
  constraint, in addition to the `id` primary key. The `slug` is the
  user-facing reference; the `id` is not intended for URLs.
- **Slug generation (ADR-046)**: `DigitalProduct` slugs are user-owned
  (manual, validated, collision-rejected with "choose another").
  `Component`/`ComponentInstance` slugs are importer-derived (from `name`/
  `externalId`, silent suffix-collision `-2`, `-3`). Editing an importer-
  managed slug creates churn (the importer re-derives it next run) — do not
  expose slug editing on importer-managed entities.

### Lifecycle vs operational state (ADR-014, ADR-035)

- `Component.lifecycle` (`ACTIVE`/`RETIRED`) is the **lifecycle** field (is
  this still in scope for the platform). It is separate from
  `ComponentInstance.status` (`RUNNING`/`STOPPED`/`ERROR`/`GONE`), which is
  the **operational** state (is this currently running). Never conflate the
  two.
- `DigitalProduct` and `ComponentGroup` also have a `lifecycle` field
  (`ACTIVE`/`RETIRED`), separate from `DigitalProduct.type`
  (`BUSINESS_CAPABILITY`/`PLATFORM`/`CUSTOMER_FACING`).
- Do not expand a two-state lifecycle into a richer state machine without a
  corresponding spec decision in the relevant `spec.md`.
- Default list/tree/dashboard queries MUST exclude `RETIRED` records and
  `GONE` instances unless an explicit filter parameter is passed by the
  caller.

### Component taxonomy (ADR-013, ADR-079)

- `Component.category` is a controlled enum of 24 values. The values live as
  `const` arrays + union types in `packages/core` (e.g.
  `COMPONENT_CATEGORIES`); the DB CHECK constraints are generated from these
  constants in migrations (ADR-078). Do not add new categories without the
  three-way update: taxonomy research → `core` constant → migration altering
  the CHECK constraint.
- `Component.provider` is a controlled enum with an `OTHER` escape hatch.
  Same three-way update rule.
- `Component.resourceType` is a free-form string carrying the provider-native
  type (e.g. `ec2:instance`, `Microsoft.Compute/virtualMachines`,
  `apps/v1:Deployment`). Importers MUST populate this from the source.
- The `CONTAINER` / `CONTAINER_ORCHESTRATION` split is intentional — it mirrors
  the Kubernetes API's workload-vs-scope distinction. Do not conflate them.
- Display metadata (labels, descriptions) for enum values lives in separate
  `*_META` maps in `core` (e.g. `COMPONENT_CATEGORY_META`), distinct from the
  value arrays. Backend imports values only; frontend imports both.

### Environment modeling (ADR-014, ADR-034, ADR-082)

- Environment is modeled as a separate `ComponentInstance` entity, NOT a field
  on `Component`. One logical `Component` → many `ComponentInstance` records
  across environments (`DEV`/`TEST`/`STAGING`/`DEMO`/`PRODUCTION`/`OTHER`).
- When a single source asset has multiple environment-specific deployments
  (e.g. one API Gateway with dev/staging/prod Stages), it is ONE `Component`
  with multiple `ComponentInstance` records. Do not duplicate the component
  per environment within a single source asset.
- When multiple distinct source assets (e.g. three EC2 instances in three
  accounts) are *considered* the same logical component by a human, they are
  separate `Component` rows grouped under a `ComponentGroup` (ADR-082). The
  group is a first-class entity (own slug/name/description/lifecycle/owner),
  NOT a graph node — no `DEPENDS_ON` to a group; products depend on member
  components individually.
- `ComponentInstance` upsert key is `(componentId, instanceExternalId)`
  (ADR-034). `environment` is an attribute, not part of the key. Importers
  MUST provide a stable per-instance `externalId`.

### ComponentInstance reconciliation (ADR-035, ADR-036, ADR-037)

- Missing instances (present in a previous run, absent from the current
  yield) are orphaned: `status = GONE`, `lastSeenAt`/`lastSeenInRunId`
  updated, row retained. Re-appearance next run flips `status` back.
- Two-phase reconciliation: (1) per-component instance orphaning during the
  run; (2) at successful run end (`import_runs.status = COMPLETED`),
  components previously touched by this importer config but not yielded this
  run get `Component.lifecycle = RETIRED`. Phase 2 is gated on `COMPLETED` —
  a failed/cancelled/interrupted run skips phase 2.
- Per-asset incremental commits (ADR-037): each yielded asset upserts in its
  own transaction. No giant run-level transaction.
- Run resume = restart from zero (ADR-038); upsert idempotency makes
  re-processing safe. No cursor in the importer contract.

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
- `OWNS` (LineOfBusiness/Team → DigitalProduct/Component) and `BELONGS_TO`
  (Person → Team) are for ownership.
- Do not introduce a parallel or competing relationship type without updating
  `researches/architecture-decisions.md` first.

### Graph persistence (ADR-048)

- 1-to-many relationships (`HAS_INSTANCE`, `OWNS`, `BELONGS_TO`) are foreign
  keys on the owned entity — NOT junction tables. `ComponentInstance.
  componentId`, `DigitalProduct.lobOwnerId`/`teamOwnerId`,
  `Component.teamOwnerId`/`componentGroupId`, `Person.teamId`.
- Many-to-many relationships (`COMPOSES`, `CONSUMES_FROM`, `DEPENDS_ON`
  product→component, `DEPENDS_ON` component→component, `SOURCES_FROM`,
  `EXPOSES`) are typed junction tables with proper FKs and per-relationship
  CHECK constraints. No polymorphic `edges` table.

### Hierarchy semantics (ADR-049, ADR-050, ADR-051)

- `COMPOSES` is a **DAG** (many parents per child), not a tree. A shared
  platform product can be composed into multiple business capabilities.
  Unlimited depth. Write-time cycle detection via a `BEFORE INSERT` trigger
  on `product_composes` (DFS check); the application catches the structured
  exception and returns `409 Cycle detected`.
- Hierarchy traversal uses a merged recursive CTE over `COMPOSES` +
  `CONSUMES_FROM`, emitting `edgeType` per hop. One query, full hierarchy,
  the caller can distinguish how each descendant was reached.

### Composition rules (enforced)

- `COMPOSES` parent MUST be `BUSINESS_CAPABILITY` or `CUSTOMER_FACING`.
- `CONSUMES_FROM` target MUST be `PLATFORM`.
- The Platform Product workflow (ADR-017) promotes a shared component to a
  platform product by: creating a `DigitalProduct` (type: PLATFORM), wiring
  `DEPENDS_ON` from it to the component, and rewriting the consumers'
  `DEPENDS_ON` edges into `CONSUMES_FROM` edges.

### Importer contract (ADR-024, ADR-056, ADR-057, ADR-064, ADR-065)

- Importers are in-tree packages under `packages/importer-<provider>/`. Each
  package exports a manifest (`./manifest` with `{name, configSchema,
  implPath}`); the backend declares them as deps and imports manifests by
  package name, resolving `implPath` lazily at run time (ADR-041). No runtime
  plugin loading, no filesystem scanning.
- Importers implement `Importer.run(config, secrets, context):
  AsyncGenerator<DiscoveredAsset>` (ADR-056, **supersedes ADR-025's
  `run(config, secretResolver)`**):
  - `config` is the typed scope from `importer_configs.scope` (validated
    against the importer's declared JSON Schema).
  - `secrets` is a `Record<string, string>` — pre-resolved by the core from
    `secretRefs` (ADR-055). Importers never see the `SecretResolver`.
  - `context = {runId, logger, signal, reportPhase, tracer?}`:
    `logger` is the abstracted `Logger` from `core` (ADR-067); `signal` is an
    `AbortSignal` for cancellation (ADR-058); `reportPhase(name)` updates
    `import_runs.currentPhase` (ADR-062); `tracer?` is an optional abstracted
    `Tracer` for opt-in child spans (ADR-068).
- Pull-only, never touch the DB. The core owns upsert (by `(category,
  provider, externalId)` for components, `(componentId, instanceExternalId)`
  for instances), dedup, `import_runs` history, and component/instance
  lifecycle.
- `DiscoveredAsset.relationships[]` is **removed from the v1 contract**
  (ADR-057). Importers yield components + instances only. Importer-declared
  candidate edges are a v2 feature.
- `validateDiscoveredAsset` in `packages/core` is the enforceable contract
  (ADR-064). It runs at test time (importer unit tests) AND runtime (core
  validates each yielded asset, logs failures to `import_run_errors`, skips
  invalid assets).
- Importer packages MUST NOT import from `packages/backend` or other
  importers (enforced by ESLint `no-restricted-imports`). They depend only on
  `packages/core`.

### Importer runs (ADR-039, ADR-059, ADR-060, ADR-061, ADR-062, ADR-063)

- **Auth boundary (ADR-039)**: Admin owns importer config; Editor+Admin can
  trigger on-demand runs; Viewers see run history. One in-flight run per
  importer config (return `409 Conflict` if already running).
- **State machine (ADR-059)**: `PENDING → RUNNING → {COMPLETED, FAILED,
  CANCELLED, INTERRUPTED}`. `COMPLETED` is the only status that triggers
  phase-2 reconciliation. `FAILED` = process alive, error captured (with
  stack trace on `import_runs`). `INTERRUPTED` = backend crashed, no error
  (set by restart recovery loop). `CANCELLED` = admin cancelled or restart
  found `cancelRequestedAt`.
- **Coordination (ADR-060)**: `202 Accepted` + `{runId}`; clients poll
  `GET /api/v1/importers/:configId/runs/:runId`. Bounded in-process queue
  (ADR-061: `IMPORTER_MAX_CONCURRENCY` env var, default 3). `PENDING`-on-
  restart → `INTERRUPTED` (not re-enqueued).
- **Cancellation (ADR-058)**: `AbortController` for live signal +
  `cancelRequestedAt` column on `import_runs` for durability. The importer
  passes `signal` to its SDK calls (`fetch`/`@aws-sdk`/`octokit` accept
  `AbortSignal` natively).
- **Progress (ADR-062)**: poll returns `{status, assetsProcessed,
  currentPhase?}`. No estimated total (false precision). Importers call
  `context.reportPhase(name)` to update `currentPhase`.
- **Errors (ADR-063)**: terminal error (`errorMessage`, `errorType`,
  `errorStack`) on `import_runs`; non-terminal per-asset errors in
  `import_run_errors` table.

### Importer config storage (ADR-040, ADR-055)

- Single `importer_configs` table: `id`, `importerName`, `label`, `schedule`
  (cron, nullable), `scope` (JSONB, importer-specific), `secretRefs` (JSONB
  array), `enabled`.
- `secretRefs` shape: `[{key, env? | file?}]` (ADR-055). The core dispatches
  on which field is present, resolves via the `SecretResolver` (env / file
  resolvers in v1; Vault/AWS SM later), and passes `secrets: Record<string,
  string>` to the importer. Importers MUST NOT store secrets.
- Each importer package declares its config schema (JSON Schema) for backend
  validation + frontend dynamic form rendering (ADR-042:
  `GET /api/v1/importers` returns the manifest list with schemas).

### Person/UserAccount unification (ADR-033)

- `Person` IS `UserAccount` — one entity with nullable auth columns
  (`passwordHash` for local-auth users, `oidcSubject` for OIDC users). A
  person may own things without ever logging in (nullable auth); a person who
  logs in has auth columns set.
- Do not introduce a separate `UserAccount` entity or a 1:1 link table.

### Sessions and authentication (ADR-043, ADR-044, ADR-053, ADR-054, ADR-073, ADR-074, ADR-075)

- Sessions are stored in a Postgres `sessions` table (ADR-043), checked on
  every authenticated request (indexed PK lookup, sub-millisecond).
  Revocable server-side via `revokedAt` — not a bare stateless JWT.
  `lastSeenAt` write-throttled to once per 60s.
- Passwords hashed with **Argon2id** via `@node-rs/argon2`, PHC-format storage
  (ADR-044).
- Login attempts MUST be rate-limited (5 failed attempts per minute per
  username or source IP → `429`).
- **RBAC (ADR-054)**: three roles (Admin/Editor/Viewer). Viewer is strictly
  read-only; Editor owns the meaning layer (products, edges, component
  lifecycle); Admin owns everything including org/infra. See the full
  permission matrix in ADR-054.
- **Authorization enforcement (ADR-053)**: global default-deny `preHandler`
  with route-pattern RBAC map + explicit `assertCan*(userId, resourceId)`
  ownership checks in the service layer. Routes not in the RBAC map are
  `403` by default.
- **OIDC (ADR-073, ADR-074)**: env vars for `OIDC_ISSUER`/`OIDC_CLIENT_ID`;
  `clientSecretRef` resolved via `SecretResolver`; role mapping in single-row
  `oidc_config` table (UI-editable). JIT provisioning on first login (default
  role Viewer). Claim mapping: dot-path `roleClaimPath` + optional
  `claimValueField` for array-of-objects; first-match-wins in mapping order;
  `default` for no-match.
- **Self-registration (ADR-075)**: `allowSelfRegistration` flag (default
  `false`, secure-by-default). When enabled, `/register` is public and new
  users are Viewer; Admin promotes via UI.
- **Bootstrap admin (ADR-066)**: `BOOTSTRAP_ADMIN_USERNAME`/
  `BOOTSTRAP_ADMIN_PASSWORD` env vars create the first Admin on a fresh DB
  (read only when DB is empty — safe to remove post-bootstrap). CLI `pnpm
  backend promote-admin --username X` for recovery.

### App settings (ADR-076)

- Env vars for infra/secret-adjacent settings (`IMPORTER_MAX_CONCURRENCY`,
  `OIDC_ISSUER`/`OIDC_CLIENT_ID`, `BOOTSTRAP_ADMIN_*`).
- DB `app_settings` (key-value, JSONB values) for operational/UI-toggled
  settings (`allow_self_registration`, `session_idle_timeout`,
  `session_absolute_timeout`, `default_user_role`).
- `SettingsService.get(key)` unifies both (checks env var first, falls back
  to DB, with typed defaults). `oidc_config` stays a structured single-row
  table (not key-value).

### Deletion model (ADR-047)

- `lifecycle`/`status` are the soft-delete for graph entities
  (`DigitalProduct`/`Component`/`ComponentGroup` use `lifecycle=RETIRED`;
  `ComponentInstance` uses `status=GONE`). Do not add a separate `deletedAt`
  field — it creates a redundant field with unclear semantics.
- Hard-delete for operational entities (`importer_configs`, `sessions`,
  `import_runs`, `Person`, `Team`, `LineOfBusiness`).
- Bulk-retire-by-config ("retire all components last touched by config X") is
  an admin feature on top of this model.
- GDPR "delete my account" = hard-delete `Person` after reassigning
  ownerships.

### Audit model (ADR-052)

- Three-tier audit:
  1. **Run-summary for importers** — `import_runs` records `assetsProcessed`,
     `assetsCreated`, `assetsUpdated`, `instancesOrphaned`,
     `componentsRetired` per run.
  2. **`entity_changes`** — logs consequential importer state changes
     (`lifecycle` flips, `status` flips, new component discovered) + all
     human entity edits. Routine attribute re-upserts are NOT logged.
  3. **`edge_changes`** — logs all edge mutations (ADDED/REMOVED) with an
     optional `reason` field.
- Do not log routine importer-driven attribute updates (noise). Log
  transitions and human edits (signal).

### Observability (ADR-032, ADR-067, ADR-068, ADR-069)

- Pino structured logging on every request, importer run, and auth event.
  Importers receive an abstracted `Logger` from `core` (ADR-067) — they do
  NOT import `pino` directly. The `Logger` interface has `debug/info/warn/
  error(msg, meta?)` + `child(meta): Logger`.
- Prometheus `/metrics` endpoint (ADR-069) — unauthenticated, network-policy-
  restricted. Metric set: importer runs/duration/assets/errors/queue,
  HTTP requests/duration, DB query duration/pool, auth login attempts/
  sessions. Low-cardinality labels only (importer name, not config ID;
  normalized route patterns, not raw paths).
- OpenTelemetry tracing (ADR-068): run-level span always created by core;
  abstracted `Tracer`/`Span` interfaces in `core` (pure TS, no OTel dep);
  opt-in child spans for importers via `context.tracer?.startSpan(name)`.
- Do not use `console.log` in production code paths. Do not defer
  instrumentation to "after the feature works."

### API conventions (ADR-070, ADR-071, ADR-080, ADR-081)

- All routes under `/api/v1/...` (ADR-070).
- Error responses: `{code, message, details?}` (ADR-071). `code` is a
  controlled enum in `packages/core` (e.g. `AUTH_RATE_LIMITED`,
  `VALIDATION_FAILED`, `CYCLE_DETECTED`). RFC 7807 wrapping is a post-v1
  additive option.
- Pagination (ADR-080): cursor-based for high-cardinality endpoints
  (components, instances, runs, audit logs) — cursor is `(createdAt, id)`;
  offset-based for low-cardinality (products, LOBs, teams, persons, importer
  configs).
- Filtering (ADR-081): fixed query params per endpoint, AND-only, single-
  value in v1. `sort=field:direction` with allow-listed sortable fields.
  Ranges/OR are v1.1.

### Package dependency graph (ADR-065)

- `packages/core` is the leaf — zero deps on other `@componode/*` packages.
  Pure TS contracts: `DiscoveredAsset`, `ComponentInstanceData`, enums,
  `Importer` interface, `validateDiscoveredAsset`, `SecretResolver`
  interface, `Logger`/`Tracer`/`Span` interfaces, Zod schemas.
- Importers depend on `core` only — NOT `backend`, NOT each other (enforced
  by ESLint `no-restricted-imports`).
- `packages/backend` depends on `core` + all 7 importer packages (manifest
  import).
- `packages/frontend` depends on `core` (types only) — NOT `backend` (calls
  via HTTP).
- Frontend serving: one container — backend serves frontend static via
  `fastify-static` in production; frontend runs own Vite dev server in dev
  with API proxy.

### Migrations (ADR-078, ADR-079)

- All migrations in `packages/backend/src/db/migrations/` (TS, Kysely schema-
  builder). One directory, one runner, one history.
- Enum values as CHECK constraints generated from `packages/core` constants
  (not native Postgres ENUMs — ENUMs are immutable-ish and the taxonomy will
  evolve). A `backend`-local helper wraps the CHECK-generation pattern (not
  in `core` — keeps `core` pure).

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

### v1 Feature Breakdown (ADR-083)

v1 is split into 6 spec-kit features with an explicit dependency graph:

1. **`001-foundation`** — `packages/core` contracts + DB schema + migrations +
   backend skeleton (Fastify, Kysely, auth middleware, error handling, session
   storage, RBAC enforcement, bootstrap admin, local auth, OIDC). Milestone:
   "deploy Componode, log in, see an empty dashboard."
2. **`002-importer-framework`** — run service, scheduler, registry,
   reconciliation, cancellation, observability for runs. Milestone: "configure
   an importer and run it."
3. **`003-component-catalog`** — component/instance services + UI (listing,
   filtering, `ComponentGroup` grouping), the 7 v1 importers. Milestone:
   "dashboard shows real components."
4. **`004-product-hierarchy`** — products, edges, ownership, Platform Product
   workflow, hierarchy UI. Milestone: "model my products." (Overlaps with 003
   after 001+002.)
5. **`005-audit-and-settings`** — audit tables, settings, admin UI.
6. **`006-deployment-and-docs`** — Docker Compose, docs, CI, changesets.

Dependencies: 001 first → 002 → 003 + 004 (overlap) → 005 + 006.

---

## Key References

| Document | Role |
|---|---|
| `researches/architecture-decisions.md` | **83 ADRs from the grilling sessions — read before any implementation** |
| `researches/component_taxonomy_research.md` | **Industry survey grounding the 24-category taxonomy** |
| `.specify/memory/constitution.md` | **7 constitution principles governing all specs — read before any spec** |
