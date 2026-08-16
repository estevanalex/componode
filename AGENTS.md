# AGENTS.md — Project Context for AI Coding Agents

> **Last updated**: 2026-08-16 (Session 2 grilling — 102 ADRs, 7 constitution principles, 19 secure development rules)
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
`researches/architecture-decisions.md` (the index) with individual ADRs in
`researches/adrs/` (**102 ADRs** from the 2026-08-16 grilling sessions:
ADR-001–032 from Session 1, ADR-033–083 from Session 2 architecture grilling,
ADR-084–102 from Session 2 secure development grilling). **Read the index and
the relevant individual ADRs before starting any implementation work.** The 7
constitution principles in `.specify/memory/constitution.md` govern all
specs — every spec is checked against them. The 19 secure development rules
(ADR-084–102) are binding for all runtime code. Changes to any decision
require a new grilling session or an explicit superseding ADR.

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
│   ├── architecture-decisions.md  # ADR index (links to individual ADR files)
│   ├── adrs/                      # Individual ADR files (ADR-001 through ADR-102)
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
  `researches/architecture-decisions.md` (and the relevant ADR in
  `researches/adrs/`) first.

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

## Secure Development

These rules are binding for all runtime code. Violations are bugs, not style
preferences. They are ratified as ADR-084 through ADR-102, with each rule in
its own file under `researches/adrs/` (see `researches/architecture-decisions.md`
for the index).

### SQL injection prevention (ADR-084)

- All database queries MUST use Kysely's parameterized query builder.
- `sql.raw()` and `sql.fragment()` are PROHIBITED in application code
  (services, routes, repositories).
- In migrations, `sql.raw()` is permitted for DDL the builder cannot express
  (e.g. trigger creation for ADR-050's cycle detection), with a
  `// SECURITY: raw SQL in migration, no user input` comment.
- Any `sql.raw()` in application code requires a documented security
  justification in the PR and a `// SECURITY:` comment. A CI grep check flags
  `sql.raw()` usage without the comment.

### XSS prevention (ADR-085)

- The frontend MUST NOT use `dangerouslySetInnerHTML` in v1. All user-
  controlled content is rendered through React's default escaping.
- If rich-text rendering is required in a future spec, it MUST use a
  sanitizing library (e.g. `dompurify`) with an allow-listed tag/attribute
  set, documented in the spec, and reviewed in the PR.
- URL fields (`url`, any `href` populated from data) MUST be validated
  against an allow-list of protocols (`http`, `https`, `mailto`) before
  rendering as `href`. `javascript:`, `data:`, and other protocol handlers
  are rejected. A shared `safeUrl(url): string | null` utility in
  `packages/frontend` centralizes this.
- All `target="_blank"` links MUST include `rel="noopener noreferrer"` to
  prevent reverse tabnabbing. A shared `<ExternalLink>` component enforces
  this.

### Session cookie security flags (ADR-086)

- The session cookie MUST be set with `HttpOnly: true`, `Secure: true` in
  production, and `SameSite: Lax`.
- The cookie name is configurable (`SESSION_COOKIE_NAME`, default
  `componode_session`).
- In dev, `Secure` is automatically `false` when `NODE_ENV !== 'production'`
  (no env var needed — the dev override is implicit and cannot be forgotten).
- A deployer running production without TLS (not recommended) can explicitly
  set `SESSION_COOKIE_SECURE=false`.
- `SameSite: Strict` is an optional deployer setting
  (`SESSION_COOKIE_SAMESITE=strict`) for high-security environments.
- No `__Host-` / `__Secure-` prefix in v1 (the dev-HTTP need conflicts with
  the prefix's TLS requirement). This is a v1.1 enhancement.

### CSRF protection (ADR-087)

- All state-changing routes (`POST`, `PUT`, `PATCH`, `DELETE`) MUST be
  protected via the **double-submit cookie pattern**: the backend sets a CSRF
  token cookie (`componode_csrf`, `HttpOnly: false`, `SameSite: Lax`, `Secure`
  matches the session cookie), and the frontend sends the token as an
  `X-CSRF-Token` header on every state-changing request.
- The backend's `preHandler` compares the cookie value to the header value —
  mismatch = `403`.
- GET routes MUST NOT have side effects (see "GET routes" below).
- This is universal (not conditional on deployment type).

### CORS configuration (ADR-088)

- CORS MUST be configured with an explicit allow-list of exact origins
  (`CORS_ALLOWED_ORIGINS` env var, comma-separated, no wildcards, no
  patterns).
- In dev, the Vite proxy (`server.proxy['/api'] = 'http://localhost:3000'`)
  is the primary mechanism — the frontend calls `/api/v1/...` same-origin,
  Vite proxies to the backend, CORS is not needed.
- In production (same-origin via `fastify-static`), CORS is not needed for
  the primary flow.
- `CORS_ALLOWED_ORIGINS` defaults to empty (CORS disabled) — a deployer
  running a separate frontend container or allowing external tools must
  explicitly set the allow-list.
- When non-empty: `Access-Control-Allow-Credentials: true` for allow-listed
  origins, `Access-Control-Max-Age: 3600`, allowed methods are the route's
  actual methods (not a wildcard `*`).
- When empty: the CORS preHandler is a no-op (no `Access-Control-Allow-*`
  headers set).

### Security headers (ADR-089)

- The backend MUST set security headers via `@fastify/helmet` (or equivalent)
  on all HTTP responses:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000` (production only, no `includeSubDomains`) |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

- HSTS is set only in production (`NODE_ENV=production`), without
  `includeSubDomains` (avoids breaking deployer's non-HTTPS subdomains).
- CSP `style-src 'unsafe-inline'` is a documented tradeoff for Tailwind CSS +
  shadcn/ui compatibility; nonce-based CSP is a v1.1 enhancement.
- Both `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` are set
  (defense in depth for legacy browsers).
- Security headers apply to all routes including `/metrics`.

### No secrets in logs (ADR-090)

- Pino log statements MUST NOT include secrets, credentials, or sensitive
  configuration.
- The backend's Pino configuration MUST include a redaction filter that
  strips the following field paths from log output (replaced with
  `"[REDACTED]"`): `password`, `passwordHash`, `clientSecret`, `secretRefs`,
  `secrets`, `secrets.*`, `sessionToken`, `sessionId`, `authorization`,
  `cookie`, `oidcSubject`, `email`, `importer_configs.secretRefs`,
  `importer_configs.scope`.
- Importers receive an abstracted `Logger` (ADR-067) pre-configured with the
  same redaction.
- When logging an importer's configuration, log only safe metadata
  (`importerName`, `configId`, `label`, `schedule`), never the full
  `importer_configs` row.
- When logging a request, log headers selectively (`content-type`,
  `user-agent`, `x-request-id`), never the full headers object.
- Stack traces are logged as-is (sanitizing stack traces is over-engineering
  for v1; the risk of embedded credentials in URLs is mitigated by the
  redaction filter catching `secrets.*`). This is a known tradeoff documented
  here.

### No secrets in commits (ADR-091)

- Secrets, credentials, API keys, private keys, and `.env` files MUST NOT be
  committed to the repository.
- The `.gitignore` MUST include `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`,
  and `secrets/`.
- CI MUST run a secret scanner on every PR — this is the enforceable
  boundary.
- A pre-commit hook (via `husky`) is a SHOULD (best-effort contributor
  feedback, bypassable with `--no-verify`).
- The example `docker-compose.yml` MUST use
  `${BOOTSTRAP_ADMIN_PASSWORD:?must set}` and `env_file: .env` for
  secret-bearing services, never inline `environment:` blocks with secret
  values.
- Example `.env.example` files (committed; `.env` is gitignored) MUST use
  placeholder values (`BOOTSTRAP_ADMIN_PASSWORD=changeme`), never
  real-looking values.
- Test fixtures with credentials MUST use clearly fake values
  (`test:test`, `postgres:postgres`) and the secret scanner's config MUST
  allow-list test fixture paths (`packages/backend/test/**`).
- If a secret is accidentally committed: the commit MUST be reverted
  (force-push to rewrite history if the secret is sensitive — this is the
  exception to the "no force-push" git rule), the secret rotated, and the
  incident documented in a post-mortem.

### Dependency scanning (ADR-092)

- CI MUST run a dependency vulnerability scanner on every PR.
- A PR that introduces a vulnerability with severity `high` or `critical`
  MUST be blocked (CI fails), unless the vulnerability is in a dev-only
  dependency that does not ship to production AND the PR includes a
  `// SECURITY:` comment documenting why it's not exploitable.
- Vulnerabilities of `moderate` or `low` severity are reported as warnings
  (CI passes, but the report is visible on the PR).
- Dependencies MUST be pinned to exact versions in `package.json` (no `^` or
  `~` ranges). Version bumps are done via `changesets` or a dedicated PR.
- Newly published versions (less than 7 days old) MUST NOT be used — wait
  for vetting. This extends the existing AGENTS.md rule (which covers new
  deps) to version bumps of existing deps.

### TLS / HTTPS for production (ADR-093)

- Production deployments MUST use HTTPS. Componode does not terminate TLS
  itself — TLS is terminated by the deployer's reverse proxy (nginx, Caddy,
  Traefik, or a cloud load balancer) in front of the Componode container.
- The backend MUST set `Strict-Transport-Security` in production (ADR-089)
  and MUST configure `trustProxy` to the proxy's IP (via `TRUSTED_PROXY_IP`
  env var, not `true`) to correctly trust `X-Forwarded-Proto`/
  `X-Forwarded-Host` headers without allowing client spoofing.
- `docs/deployment.md` MUST document TLS setup for at least two reverse
  proxy options (Caddy for automatic Let's Encrypt, nginx for manual/explicit
  config).
- The example `docker-compose.yml` MUST include a commented-out Caddy
  service as the recommended quick-start, with a note pointing to
  `docs/deployment.md` for nginx/Traefik alternatives.
- Dev runs over HTTP (`localhost`) — no TLS required in dev. HTTPS in dev
  (via mkcert) is an optional contributor convenience, not mandated.

### GET routes must not have side effects (ADR-094)

- `GET` and `HEAD` routes MUST be idempotent and side-effect-free with
  respect to domain state. They MUST NOT mutate domain entities (components,
  products, instances, edges, importer configs, runs), trigger importer
  runs, modify sessions (other than `lastSeenAt` operational bookkeeping per
  ADR-043), or perform any action that changes persistent domain state.
- Any state-changing operation MUST use `POST`, `PUT`, `PATCH`, or `DELETE`
  with CSRF protection (ADR-087).
- Operational bookkeeping (`sessions.lastSeenAt` write-throttled updates,
  `import_runs.lastPolledAt` if added) is permitted on GET routes — these
  are observability/operational side effects, not domain state changes, and
  are not CSRF-exploitable.
- Read-access auditing (logging "user X viewed component Y" to
  `entity_changes`) is NOT performed on GET routes in v1 — ADR-052's
  `entity_changes` logs consequential state changes and human edits, not
  read access. If read-access auditing is added in a future spec, it MUST be
  performed by an asynchronous middleware decoupled from the GET route's
  response path, and the spec MUST document the CSRF implications.

### Input validation (ADR-095)

- All API request inputs (path params, query params, request bodies) MUST be
  validated at the route boundary using Zod schemas.
- A request that fails validation receives `400` with
  `{code: "VALIDATION_FAILED", message, details: [{field, issue}]}` (ADR-071).
- Unknown fields in request bodies are rejected (Zod `.strict()`), not
  silently dropped.
- String inputs have max-length constraints: default 255 for names/labels,
  100 for slugs, 2000 for descriptions, 100 for `resourceType`. A spec may
  override these defaults with a documented justification.
- Enum inputs are validated against the `core` constants (ADR-079).
- Validation schemas shared between backend and frontend (e.g.
  `DigitalProduct` create/update, `ComponentGroup` create/update) live in
  `packages/core`. Backend-only schemas (e.g. importer config creation,
  admin-only endpoints) live in `packages/backend/src/routes/schemas/`.
- The Fastify server MUST enforce a max request body size (`bodyLimit: 1MB`
  default, configurable via `MAX_REQUEST_BODY_SIZE` env var). Requests
  exceeding the limit receive `413 Payload Too Large`.

### Error responses must not leak internals (ADR-096)

- Error responses MUST use the `{code, message, details?}` format (ADR-071)
  with controlled `code` enums from `packages/core`.
- Error `message` and `details` MUST NOT include: stack traces, internal
  file paths, SQL query text, raw database error messages, environment
  variable names, or internal service names.
- Stack traces are logged server-side via Pino (ADR-090) but never sent to
  the client.
- Database errors are caught at the service layer and translated into
  controlled error codes:

| Postgres SQLSTATE | HTTP | `code` |
|---|---|---|
| `23505` (unique violation) | `409` | `DUPLICATE_SLUG` / `DUPLICATE_KEY` |
| `23514` (CHECK violation) | `400` | `VALIDATION_FAILED` |
| `23503` (FK violation) | `409` | `REFERENTIAL_INTEGRITY` |
| `40P01` (deadlock) | `409` | `CONFLICT_RETRY` |
| Cycle-detection exception (ADR-050) | `409` | `CYCLE_DETECTED` (with `details: {cycle: [productId, ...]}`) |

- In dev, error responses MAY include a `debug` field with the original
  error message, gated by an explicit `DEBUG_ERROR_DETAILS=true` env var
  (not `NODE_ENV` — avoids misconfiguration leaks).
- The `debug` field is never populated for auth-related error codes
  (`AUTH_INVALID_CREDENTIALS`, `AUTH_RATE_LIMITED`, `AUTH_SESSION_EXPIRED`,
  `AUTH_FORBIDDEN`, `OIDC_CALLBACK_FAILED`).

### Rate limiting (ADR-097)

- The backend MUST enforce rate limits via a rate-limiting Fastify plugin
  with an in-memory store for v1 (single-instance per ADR-065).
  Multi-instance deployments (post-v1) require a shared store (Redis) —
  documented as a known v1 limitation.

| Endpoint category | Limit | Keyed by | Window | On exceed |
|---|---|---|---|---|
| Login (`POST /api/v1/auth/login`) | 5 | username or source IP | 1 min | `429` `AUTH_RATE_LIMITED` + `Retry-After` |
| OIDC callback (`POST /api/v1/auth/oidc/callback`) | 5 | source IP | 1 min | `429` `AUTH_RATE_LIMITED` + `Retry-After` |
| Registration (`POST /api/v1/auth/register`, if enabled) | 3 | source IP | 1 min | `429` `AUTH_RATE_LIMITED` + `Retry-After` |
| Importer trigger (`POST /api/v1/importers/:configId/trigger`) | 10 | user (session ID) | 1 min | `429` `RATE_LIMITED` + `Retry-After` |
| General API (`/api/v1/*`, authenticated) | 300 | user (session ID) | 1 min | `429` `RATE_LIMITED` + `Retry-After` |
| `/metrics` | Unlimited | — | — | — |

- Rate limit responses include a `Retry-After` header (seconds until reset).
- The general API limit is per-user (session ID), not per-IP (corporate NAT
  safety).
- All `/api/v1/*` routes are authenticated (Viewer minimum per ADR-054) —
  no unauthenticated API routes except `/metrics`.

### Importer sandboxing (ADR-098)

- Importers are untrusted code that executes within the backend's process.
  The following constraints MUST be enforced via ESLint
  `no-restricted-imports` and `no-restricted-syntax` rules in importer
  packages' ESLint configs (static, CI-enforceable):
  1. **Filesystem**: `fs`, `fs/promises`, `fs-extra` imports are PROHIBITED.
  2. **Environment variables**: `process.env` access is PROHIBITED. SDKs
     that default to `process.env` (e.g. `@aws-sdk`) MUST be configured with
     explicit values from the `secrets`/`config` parameters.
  3. **Child processes**: `child_process`, `execa`, `shelljs` imports are
     PROHIBITED.
  4. **Dynamic code**: `eval`, `new Function`, `vm` module, `import()`
     expressions are PROHIBITED via `no-restricted-syntax`.
  5. **Permitted**: `fetch`/HTTP clients (outbound API calls),
     `Logger`/`Tracer` from `core`, `validateDiscoveredAsset` from `core`,
     the importer's own package files.
- True process-level sandboxing (worker threads, separate containers) is a
  post-v1 enhancement. The ESLint rules are static enforcement that prevents
  accidental leakage and catches malicious PRs at the CI boundary — they do
  not protect against a determined attacker who bypasses ESLint and passes
  review.

### Secure password and credential handling (ADR-099)

- **Password hashing (ADR-044)**: Argon2id via `@node-rs/argon2`, PHC format.
  Parameters configurable via env vars (`ARGON2_MEMORY_COST`,
  `ARGON2_TIME_COST`, `ARGON2_PARALLELISM`) with OWASP defaults (19 MiB
  memory, 2 iterations, 1 parallelism lane).
- **Password complexity**: Minimum 12 characters, no maximum, no complexity
  rules (NIST SP 800-63B — length over complexity). Rejected with `400
  {code: "WEAK_PASSWORD"}`.
- **Password reset**: Admin-triggered, via secure reset token (32 bytes,
  base64url). Token stored as SHA-256 hash in `password_reset_tokens` table.
  Expires after 15 minutes. Single-use. The Admin never knows the new
  password. Email delivery is post-v1; in v1 the token is displayed to the
  Admin who communicates it out-of-band.
- **OIDC client secret**: Stored as `clientSecretRef` (ADR-073), resolved via
  `SecretResolver`, held in memory only for the OIDC token exchange.
- **Importer secrets**: Resolved secrets held in memory only for the run
  duration, not cached/persisted/logged, dereferenced after run completion.
- **Bootstrap admin password**: Read once on empty-DB boot, hashed
  immediately, plaintext not retained.
- **Timing attacks**: Login hashes a dummy password for non-existent users
  to equalize response time. Prevents user enumeration via timing.
- **Session token generation**: Session IDs are cryptographically random
  (32 bytes, base64url), NOT UUID v7. The `sessions.id` is a random token,
  not a time-sortable UUID. This is an exception to ADR-045's "UUID v7 for
  all entities" — session tokens are credentials, not entity identifiers,
  and require cryptographic randomness.

### Audit log integrity (ADR-100)

- Audit log tables (`entity_changes`, `edge_changes`, `import_run_errors`)
  are **append-only**. The backend MUST NOT expose `UPDATE` or `DELETE`
  operations on these tables via any API endpoint, service method, or CLI
  command.
- Database-level enforcement: a `BEFORE UPDATE OR DELETE` trigger on all
  three tables raises an exception unconditionally.
- No role — including Admin — can modify or delete audit entries.
  Corrections are new entries (`entity_changes` with `action: CORRECTION`,
  referencing the original entry's ID), not edits.
- `import_runs` is NOT append-only (status transitions, asset counts, and
  error fields are legitimately updated during and after the run). However,
  `import_runs.createdAt` is immutable after creation, and the entire row is
  immutable after reaching a terminal state (`COMPLETED`/`FAILED`/
  `CANCELLED`/`INTERRUPTED`) — a `BEFORE UPDATE` trigger enforces this by
  checking `OLD.status` against the terminal set.
- Operator notes on a run ("caused by AWS outage") are added as
  `entity_changes` entries, not mutations on `import_runs`.
- **GDPR interaction**: `entity_changes.createdBy`/`updatedBy` are nullable
  FKs to `persons` with `ON DELETE SET NULL`. When a `Person` is
  hard-deleted (ADR-047), the audit entries' `createdBy`/`updatedBy` are set
  to `NULL`, preserving the audit trail without retaining the person's
  identity. A denormalized `createdByName`/`updatedByName` snapshot
  (captured at write time) retains the name for historical context — this is
  a deliberate tradeoff (audit integrity vs. right-to-be-forgotten).
- **Retention policy**: No automatic retention policy in v1 (audit entries
  retained indefinitely). A v1.1 feature may add configurable retention with
  archival.

### Database connection security (ADR-101)

- **TLS to Postgres**: `DATABASE_SSL_MODE` env var controls the SSL mode.
  Default: `require` in production, `disable` in dev. For remote Postgres
  (RDS, Cloud SQL), the deployer SHOULD set `DATABASE_SSL_MODE=verify-full`
  and configure `DATABASE_SSL_CA` (path to CA cert).
- **Connection pool limits**: `MAX_DB_CONNECTIONS` env var (default 10). The
  example `docker-compose.yml` documents the pool budget calculation:
  `MAX_DB_CONNECTIONS (10) × backend instances (1 in v1) +
  IMPORTER_MAX_CONCURRENCY (3) + reserved (5) = 18 < Postgres
  max_connections (100)`.
- **Credential rotation**: `DATABASE_URL` from env var. Rotation = update
  env var + restart. No in-app rotation in v1.
- **Least-privilege DB user**: The example `docker-compose.yml` MUST include
  an `init-db.sql` script (mounted into the Postgres container's
  `docker-entrypoint-initdb.d/`) that creates a `componode` user with
  `CONNECT` on the `componode` database + full DML/DDL on the `public`
  schema. The application connects with this user (not the Postgres
  superuser).
- **Migration privileges**: v1 uses a single `componode` user with DDL+DML.
  A split (`MIGRATION_DATABASE_URL` for DDL, `DATABASE_URL` for DML-only) is
  a v1.1 enhancement.
- **Driver**: The spec (001-foundation) chooses the Postgres driver — this
  rule does not mandate a specific driver, but the chosen driver MUST
  support TLS, prepared statements, and configurable pool limits.

### Content injection in JSONB fields (ADR-102)

- Importer-yielded JSONB fields (`Component.details`,
  `ComponentInstance.rawConfig`, and any future free-form JSON fields)
  contain arbitrary untrusted data.
- **Frontend rendering**: JSONB fields MUST be rendered as structured data —
  individual values rendered as text in React components (React's default
  escaping applies), or as a JSON tree via a component that renders values
  as text (not HTML). The frontend MUST NOT pass JSONB field values through
  `dangerouslySetInnerHTML` (ADR-085), `eval()`, or any HTML/string
  interpretation function.
- **URLs in JSONB**: URLs found within JSONB fields (at any nesting depth)
  MUST be sanitized via the `safeUrl()` utility (ADR-085) before rendering
  as `href` attributes. JSON tree components used in the frontend MUST NOT
  auto-link URLs (or MUST sanitize via `safeUrl()` if they do).
- **Markdown / rich text**: Rendering JSONB fields as markdown or rich text
  is PROHIBITED in v1. If a future spec requires markdown rendering, it MUST
  use a sanitizing renderer (`react-markdown` + `rehype-sanitize` with an
  allow-listed tag/attribute set), and the raw markdown MUST be stored in a
  dedicated field (not a free-form `details` JSONB) to clearly mark it as
  rich-text content requiring sanitization.
- **Backend error responses**: If a validation error includes a JSONB field
  value in the `details` of a `400` response, the value is rendered as text
  by the frontend's error display (React escapes). This is safe. The
  backend MUST NOT include JSONB values in error `message` strings.
- **Backend SQL**: JSONB fields are stored and queried via Kysely's JSONB
  operators, never via string interpolation (ADR-084).

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
| `researches/architecture-decisions.md` | **ADR index — links to 102 individual ADR files in `researches/adrs/`. Read before any implementation** |
| `researches/adrs/` | **Individual ADR files (ADR-001 through ADR-102)** |
| `researches/component_taxonomy_research.md` | **Industry survey grounding the 24-category taxonomy** |
| `.specify/memory/constitution.md` | **7 constitution principles governing all specs — read before any spec** |
