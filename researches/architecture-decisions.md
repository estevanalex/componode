# Componode — Architecture Decisions Record

> **Session**: 2026-08-16 grilling session
> **Status**: Ratified — these decisions are the foundation for Componode v1.
> **How to use**: Read this before starting any implementation work. Each
> decision includes the context, the choice, and the rationale. Changes to
> any decision require a new grilling session or an explicit superseding ADR.

---

## Identity & Direction

### ADR-001 — Deployment model: self-hosted single-organization tool

**Context**: The prior project (DPAM) was a hosted multi-tenant SaaS with
tenant isolation in every query. The pivot to open source re-opens this
decision.

**Decision**: **Self-hosted single-organization tool.** One deployment = one
org/team installs it (Docker Compose) and points it at their own GitHub/AWS/etc.
No multi-tenancy. The `Organization`/tenant layer, tenant-isolation-in-every-query
rule, and per-tenant scale targets are deleted.

**Rationale**: Matches the importers-first value prop (you point *your* tool at
*your* GitHub/AWS). Lets the existing multi-tenant code be deleted rather than
carried. If a hosted offering comes later, it's a clean upgrade path (open-core:
OSS single-org core + hosted multi-tenant SaaS built on top).

---

### ADR-002 — License: Apache 2.0

**Context**: The tool imports from proprietary platforms (AWS, Azure, GitHub)
and may be wrapped into commercial offerings.

**Decision**: **Apache 2.0.** Patent grant, commercial-friendly, matches the
ecosystem (Backstage, cartography, Steampipe, Kubernetes).

**Rationale**: Maximizes adoption and contributor growth. The patent grant
matters because we interface with proprietary platforms. AGPL's network-service
clause chases away enterprise self-hosters with blanket AGPL bans. If a hosted
offering is built later, it's licensed separately — the OSS core stays Apache 2.0.

---

### ADR-003 — Project name: Componode

**Context**: The repo needs a real name for the OSS release (package name,
README, import paths, Docker image).

**Decision**: **Componode** (component + node). Evokes "components" + "node"
(graph), fits the catalog/composable direction.

**Note**: Name availability (npm, Docker Hub, GitHub org, PyPI, trademark)
must be verified before public launch.

---

### ADR-004 — Greenfield in new repo

**Context**: Nearly every architectural decision changes a load-bearing layer
of the prior project (Neo4j→Postgres, multi-tenant→single-org, Cypher→Kysely,
no importers→importer framework, etc.).

**Decision**: **Greenfield rewrite in a new repo** at
`github.com/estevanalex/componode`. The prior repo
(`D:\Repositories\test-project`) becomes the research/specs archive.

**Rationale**: The migration depth is too large for incremental migration.
A clean repo gives a clean public commit history with no trace of the prior
multi-tenant SaaS work. The old code remains in git history in the archive repo.

---

### ADR-005 — Existing assets: restructure with archive

**Context**: The prior repo carries research docs, spec-kit feature docs, and
skills that are a mix of still-valuable and now-stale.

**Decision**: **Restructure with an archive.**
- `researches/archive/` in the old repo holds superseded multi-tenant SaaS docs
  + the foundation spec.
- The Composable Product Model research and the new taxonomy research are the
  living references (copied to the new repo).
- `AGENTS.md` is rewritten for Componode (single-org, taxonomy, importer
  contract, relationship types).
- `.specify/` + `.devin/skills/` are retained (spec-kit workflow, content
  updated for Componode).

---

## Architecture & Data

### ADR-006 — Database: PostgreSQL

**Context**: The prior project used Neo4j 5 Community. The Composable Product
Model is graph-shaped, but the v1 headline is importers, not graph analytics.

**Decision**: **PostgreSQL** (replaces Neo4j). Recursive CTEs handle the
product hierarchy; JSONB handles polymorphic components; `ON CONFLICT` upserts
handle importer idempotency.

**Rationale**: For an OSS tool whose v1 headline is importers, contributor
friction on the import path is the thing we can least afford. Every backend dev
writes SQL; far fewer write Cypher. Polymorphic Component types fit Postgres's
typed-table + JSONB pattern cleanly. The PostgreSQL license is permissive.
Neo4j's graph-native traversal is an advantage we collect *later* (blast-radius
analytics, roadmap Phase 4+), not a tax we pay *now*.

---

### ADR-007 — Backend framework: Fastify (kept)

**Context**: The prior project used Fastify + neo4j-driver. The DB change
doesn't force a framework change.

**Decision**: **Keep Fastify.** Pair with a TypeScript-first Postgres layer
(Kysely, ADR-008). The importer-module pattern is a TypeScript interface +
registry, not a framework swap.

**Rationale**: Fastify is already in place, TS-friendly, its plugin system is
good enough for an importer-module pattern. Switching frameworks burns time we
want to spend on importers.

---

### ADR-008 — Data layer: Kysely

**Context**: The prior project used the Neo4j driver directly (no ORM). For
Postgres in TypeScript, the options are ORM, query builder, or raw SQL.

**Decision**: **Kysely** (query builder, no ORM). Type-safe fluent SQL,
recursive CTEs for hierarchy, JSONB for polymorphic components, `ON CONFLICT`
upserts for importers — all first-class.

**Rationale**: v1 is dominated by polymorphic Component queries, recursive
CTEs, and importer upserts — exactly what Kysely is best at and ORMs are
weakest at. No schema-codegen workflow imposed on contributors. Pairs with
Kysely's built-in migration system (ADR-009).

---

### ADR-009 — Migrations: Kysely built-in

**Context**: Kysely has no built-in migrations tool of its own; a migration
runner is needed.

**Decision**: **Kysely's built-in migration system.** Migrations written in
the same type-safe query builder as the services; one tool owns the data layer.

**Rationale**: Keeps the data layer in one tool — migrations and query code
stay in one mental model and one dependency tree. `node-pg-migrate` is the
fallback if a gap emerges (migrations are just SQL files, switching is cheap).

---

### ADR-010 — Frontend: React + Vite + TanStack Query + Tailwind (kept) + shadcn/ui

**Context**: The prior frontend is React 18 + Vite + TanStack Query + React
Router + Tailwind. The pivot doesn't change the frontend's job (data-heavy
internal-tool UI).

**Decision**: **Keep the current stack.** Add **shadcn/ui** (Radix primitives +
Tailwind) for the forms/tables/dialogs the importer config UI will need.

**Rationale**: The existing stack is exactly what an internal data tool wants.
The gap is just "we need decent forms/tables/dialogs" — shadcn/ui solves that
without adopting a heavy component framework. Next.js's SSR story is wasted on
an authed internal tool.

---

### ADR-011 — Build orchestration: pnpm workspaces + Turborepo

**Context**: The monorepo will have ~10 packages (core, backend, frontend, 7
importers) with cross-dependencies.

**Decision**: **pnpm workspaces + Turborepo.** Task pipelines in `turbo.json`
(`build` depends on `^build`, `test` depends on `build`), local + remote
caching, `--filter` for affected-package runs. Importer scaffolding via a
copy-template script + ESLint boundary rules (not Nx generators).

**Rationale**: At ~10 packages with cross-deps, the no-cache tax becomes real.
Turborepo fixes that with one config file and is the de-facto standard for this
monorepo shape. Nx's generators are tempting but a copy-template script
achieves the same contributor outcome without Nx's overhead.

---

### ADR-012 — Repo structure: pnpm monorepo with workspaces

**Context**: Importers need isolation (the AWS importer pulls `@aws-sdk/*`, the
GitHub importer pulls `octokit` — they shouldn't pollute each other).

**Decision**: **pnpm monorepo with workspaces.**
- `packages/core` — shared contracts (`DiscoveredAsset`, `Component`,
  `ComponentInstance`, `DigitalProduct`, the `Importer` interface).
- `packages/backend` — Fastify API + Kysely services + scheduler.
- `packages/frontend` — React/Vite dashboard.
- `packages/importer-github`, `packages/importer-aws`, `packages/importer-azure`,
  `packages/importer-kubernetes`, `packages/importer-web-url`,
  `packages/importer-api-url`, `packages/importer-mcp-server` — one package per
  importer, each with isolated deps.

**Rationale**: Each importer is a package with its own manifest, tests, and
dependency set. The shared `DiscoveredAsset` contract in `packages/core` is the
seam that keeps importers uniform. This structure enables publishing importers
as standalone npm packages later (path to runtime-loaded plugins).

---

## Domain Model

### ADR-013 — Component taxonomy: 24 categories + provider + resourceType

**Context**: The component type taxonomy is the heart of the tool. Research
across 18 tools (IDPs, cloud/CSPM, API/MCP, CMDB/EA, Kubernetes) confirmed
two-level classification is the industry norm.

**Decision**: **Two-level discriminator: `Component.category` (enum) +
`Component.provider` (enum) + free-form `Component.resourceType` (string).**

**24 categories** (all in v1):
```
COMPUTE, SERVERLESS, CONTAINER, CONTAINER_ORCHESTRATION,
DATABASE, STORAGE, NETWORK, QUEUE, CDN, DNS, CERTIFICATE, SECRET, KMS_KEY,
IDENTITY, OBSERVABILITY, API, MCP_SERVER, WEB_ENDPOINT,
REPOSITORY, PACKAGE_REGISTRY, DOCUMENTATION, IAC, JOB, LIBRARY
```

**Provider enum** (with `OTHER` escape hatch):
```
AWS, AZURE, GCP, ALIBABA_CLOUD, CLOUDFLARE,
OPENSHIFT, KUBERNETES, DOCKER, PODMAN,
GITHUB, GITLAB, BITBUCKET, AZURE_DEVOPS,
APIGEE, KONG, AWS_API_GATEWAY, GRAVITEE, BOOMI, MULESOFT,
MCP, OKTA, KEYCLOAK, ENTRA_ID,
DATADOG, PAGERDUTY, SENTRY, NEWRELIC,
NPM, PYPI, MAVEN, NUGET, ECR, GHCR,
ON_PREM, OTHER
```

**`resourceType`** carries the provider-native type verbatim (e.g.
`ec2:instance`, `Microsoft.Compute/virtualMachines`, `apps/v1:Deployment`).

**Rationale**: Grounded in primary-source research
(`researches/component_taxonomy_research.md`). Matches AWS Resource Explorer
(`{service}:{resource-type}`), Azure Resource Graph
(`{provider}/{resource-type}`), cartography (provider-prefixed labels),
Humanitec (`type` + `driver_type`). The `CONTAINER`/`CONTAINER_ORCHESTRATION`
split mirrors the Kubernetes API's own workload-vs-scope distinction. MCP_SERVER
is a genuinely new asset class (Port ships `_mcp_server`; MCP spec defines
servers by tools/resources/prompts capabilities).

---

### ADR-014 — Environment: separate ComponentInstance entity

**Context**: A component almost always exists in multiple environments
simultaneously (dev + staging + prod).

**Decision**: **Separate `ComponentInstance` entity.** One logical `Component`
→ many `ComponentInstance` records across environments
(`DEV`/`TEST`/`STAGING`/`DEMO`/`PRODUCTION`/`OTHER`).

```
Component {category, provider, resourceType, lifecycle, ...}  // logical, env-agnostic
    -[:HAS_INSTANCE]-> ComponentInstance {
        environment: enum[DEV, TEST, STAGING, DEMO, PRODUCTION, OTHER],
        url: string,
        region: string,
        status: enum[RUNNING, STOPPED, ERROR, ...],
        version: string,
        deployedAt: datetime,
        rawConfig: json
    }
```

**Rationale**: Validated by research — ServiceNow CSDM (Business Application →
per-env deployments), Humanitec (per-env Resource instances), Apigee (proxy →
env deployments), AWS API Gateway (RestAPI → Stage). A field on Component
either duplicates the component per env (loses identity) or stores a list
(unqueryable). The instance pattern keeps identity stable and lets each env
carry its own URL/status/version.

**Lifecycle vs operational state**: `Component.lifecycle` (`ACTIVE`/`RETIRED`)
on the logical component (is this still in scope); `ComponentInstance.status`
(`RUNNING`/`STOPPED`/`ERROR`) on the instance (is this currently running).
These must not be conflated.

---

### ADR-015 — Product→Component dependency: logical, env-agnostic

**Context**: The product hierarchy depends on components. The question is
whether the dependency is on the logical component or the env-specific instance.

**Decision**: **`DigitalProduct DEPENDS_ON Component`** (logical, env-agnostic)
for v1. Per-env blast-radius (product depends on specific instance) is
documented as a Phase 4+ evolution.

**Rationale**: "Checkout depends on payments-api" is the stable,
judgment-bearing statement; "and here are payments-api's instances across
dev/staging/prod" is a navigation, not a separate dependency. Matches LeanIX
(Application → IT Component) and Backstage (Component → Resource).

---

### ADR-016 — Component→Component relationships

**Context**: Components relate to each other in multiple ways (shared
dependencies, code provenance, API exposure).

**Decision**: Three typed component-to-component relationships:
- **`DEPENDS_ON`** (Component → Component): runtime dependency, many-to-many.
  The shared-component case (5 services depend on 1 database = 5 edges).
- **`SOURCES_FROM`** (Component → Component): code provenance (service →
  repository). Many-to-many (one service → many repos, one repo → many
  services). Distinct from `DEPENDS_ON` because deleting a repo doesn't take
  down a running service.
- **`EXPOSES`** (Component → Component): a service component exposes an API
  component. Distinct from `DEPENDS_ON` (a service doesn't "depend on" the API
  it exposes; it *provides* it).

**Rationale**: `DEPENDS_ON` already handles the shared-component case — the
"sharing" is in the graph topology, not a special relationship type. The
Platform Product + `CONSUMES_FROM` pattern (ADR-018) handles governance of
shared infrastructure at the product level.

---

### ADR-017 — Platform Product workflow: full guided workflow in v1

**Context**: The Composable Product Model's core value is governing shared
infrastructure via platform products.

**Decision**: **Full guided workflow in v1:**
1. **Detection**: UI surfaces components depended-on by multiple products
   ("Kafka-cluster-X is depended on by 4 business products — consider making
   it a platform product").
2. **Promotion action**: User clicks "Create platform product from this
   component" → creates a `DigitalProduct` (type: PLATFORM), wires
   `DEPENDS_ON` from the platform product to the component, rewrites existing
   `DEPENDS_ON` edges from consuming business products into `CONSUMES_FROM`
   edges pointing at the new platform product.
3. **Ownership assignment**: Workflow prompts for an owner (Team or LOB) for
   the new platform product.

**Rationale**: Half a workflow (detect but don't promote, or promote but don't
rewrite) is frustrating. The edge-rewrite is a bounded transaction (N edges
out, N+1 edges in). This feature most directly demonstrates the Composable
Product Model's value — "watch shared infrastructure become governed."

---

### ADR-018 — Product types: enum with enforced composition rules

**Context**: The Composable Product Model defines product roles (business
capability, platform, customer-facing).

**Decision**: **`DigitalProduct.type` enum: `BUSINESS_CAPABILITY` | `PLATFORM`
| `CUSTOMER_FACING`.** Composition rules enforced:
- `COMPOSES` parent ∈ {BUSINESS_CAPABILITY, CUSTOMER_FACING}
- `CONSUMES_FROM` target = PLATFORM

**Rationale**: The Platform Product workflow (ADR-017) requires a `PLATFORM`
type to exist. `CONSUMES_FROM`'s semantic ("business product consumes shared
platform product") only holds if the target is typed `PLATFORM`. Without the
type, `CONSUMES_FROM` collapses into a synonym for `COMPOSES`.

---

### ADR-019 — Hierarchy authoring: manual for v1

**Context**: Importers populate components; the product hierarchy is the
high-value, high-judgment layer.

**Decision**: **Manual only for v1.** Importers populate the factual layer
(components, instances, environments); humans curate the meaning layer
(products, composition). The `relationships?` field on `DiscoveredAsset` is
reserved for future importer-declared candidate edges (v2: staged as
candidates, human-confirmed).

**Rationale**: "Does the Payments product compose the Fraud product, or consume
from it?" is a business/architecture decision, not something a GitHub importer
can reliably infer. v1 keeps the importer contract clean.

---

### ADR-020 — Ownership: LineOfBusiness + Team + Person

**Context**: The Composable Product Model has `OWNS` relationships. The
prior project had LOB as a seed-only fixture.

**Decision**: **`LineOfBusiness` + `Team` + `Person`, all manageable entities.**
- `LineOfBusiness OWNS DigitalProduct` (top of hierarchy)
- `Team OWNS DigitalProduct` / `Component` (day-to-day accountability)
- `Person BELONGS_TO Team`

**Rationale**: Full ownership graph matches the Composable Model and LeanIX.
The Platform Product workflow's owner assignment can target a Team or an LOB.

---

### ADR-021 — Risk: deferred entirely from v1

**Context**: The prior project had `Risk` as a model-only entity with no API/UI.

**Decision**: **`Risk` deferred entirely from v1.** No Risk entity, no dashboard
count, no `/risks` link. Returns in a later phase with ASPM/security-findings
importers + scoring fields.

**Rationale**: Risk is a layer on top of assets — it's only valuable once you
have a populated asset graph, and its real value comes from automated
security-findings import, not manual entry. Shipping a manual Risk CRUD in v1
creates a feature that looks like the real thing but isn't. Build Risk in the
phase that actually consumes it.

---

## Importer Framework

### ADR-022 — Importer execution: scheduled + on-demand

**Context**: Importers need to keep the asset inventory current.

**Decision**: **Scheduled (cron) + on-demand.** In-process scheduler
(`node-cron` or similar) + `import_runs` history table. Each importer config
has a schedule (e.g. "every 1h", "daily"); users can also trigger manual runs.

**Rationale**: On-demand only is too manual for an asset-inventory tool whose
value is "always-current picture." Event/webhook-driven is too complex for v1.
Scheduled + on-demand matches cartography/Steampipe/Prowler.

---

### ADR-023 — Importer credentials: external secret stores

**Context**: Importers need credentials to access GitHub/AWS/etc. The app
should not be a secret store.

**Decision**: **Credentials resolved from external secret stores via a
`SecretResolver` interface.** v1 ships `env` (read from process env) and
`file` (read from a mounted file) resolvers. Vault/AWS Secrets Manager
resolvers are easy adds later. No secrets at rest in the app DB.

**Rationale**: The app is already a secret store for importer credentials —
adding a parallel user-credential store and session lifecycle doubles the
security surface. Pushing the burden to the deployer's existing secret infra
keeps the OSS artifact out of the business of being a KMS. Consistent with the
"deployer brings infra" posture.

---

### ADR-024 — Importer registry: in-tree, code-registered

**Context**: The way contributors add new importers defines the project's
extensibility contract.

**Decision**: **In-tree, code-registered.** Every importer lives in the repo
under `packages/importer-<provider>/`, implements a common `Importer`
interface, and is auto-discovered at boot via a registry. Contributors add a
new importer by opening a PR with a new package. No runtime plugin loading.

**Rationale**: No arbitrary-code-execution attack surface. Full type safety at
build time. Contributors open PRs; maintainers review. This is how Backstage
plugins and cartography modules work.

---

### ADR-025 — Importer interface: pull-only AsyncGenerator

**Context**: The importer contract must be uniform for the ecosystem to work.

**Decision**: **Pull-only sync.** `Importer.run(config, secretResolver):
AsyncGenerator<DiscoveredAsset>` — the importer pulls from the source, yields
normalized asset records, and the core persists them (upsert by
`(category, provider, externalId)`). The importer never touches the DB.

**`DiscoveredAsset` shape**:
```typescript
{
  category: ComponentCategory;
  provider: ComponentProvider;
  externalId: string;          // stable source-native ID for dedup
  name: string;
  resourceType?: string;       // provider-native type
  details?: Record<string, unknown>;  // source-specific JSONB
  instances?: ComponentInstanceData[];  // env-specific deployments
  relationships?: Array<{      // reserved for v2 candidate edges
    targetExternalId: string;
    type: 'DEPENDS_ON' | 'SOURCES_FROM' | 'EXPOSES';
  }>;
}
```

**Rationale**: The importer is a pure async generator. The core owns upsert,
dedup, `import_runs` history, and component/instance lifecycle. A contributor
writing a GCP importer never imports Kysely, never writes SQL, never thinks
about transactions — they implement one function that yields assets. That's
the difference between "we have a plugin ecosystem" and "we have a folder of
incompatible scripts."

---

### ADR-026 — v1 importer scope: 7 importers

**Context**: Shipping all listed providers in v1 is unrealistic. OSS importer
ecosystems ship a credible starter set and contributors add the rest.

**Decision**: **7 importers covering all four patterns:**
1. **GitHub** (repo pattern)
2. **AWS** (cloud pattern — polymorphic components across compute/db/storage/network)
3. **Azure** (cloud pattern — proves it's not AWS-specific)
4. **Kubernetes** (container/orchestration pattern — namespace-as-env, workloads)
5. **Web URL** (endpoint-probe pattern — simplest, proves ComponentInstance + environment)
6. **API URL** (endpoint pattern variant — OpenAPI/health probe)
7. **MCP server** (new asset class — differentiates from Backstage/cartography)

**Remaining providers** (GitLab, Bitbucket, Azure DevOps, Alibaba Cloud,
Cloudflare, OpenShift, Docker/Podman) = **contributor-welcome issues** with
the importer interface documented and GitHub/AWS as reference templates.

**Rationale**: Shipping 4 half-baked cloud importers is worse than 2 solid
ones that prove the pattern. The contributor template + "good first issue"
label closes the gap faster than writing all of them ourselves.

---

## Auth & Security

### ADR-027 — Authentication: built-in local + optional OIDC

**Context**: Authentication is non-negotiable. The prior project had full RBAC
+ server-side sessions. Deployers may or may not have an external IdP.

**Decision**: **Built-in local auth (default) + optional OIDC integration.**

- **Built-in local auth** (no external IdP required): username/password,
  server-side sessions (4h idle / 12h absolute timeout), explicit logout,
  login rate limiting, RBAC (Admin/Editor/Viewer).
- **Optional OIDC integration** (for deployers with an external IdP): OpenID
  Connect provider config (Okta, Keycloak, Entra ID, Google, etc.).
  - **JIT provisioning**: first OIDC login auto-creates the `UserAccount` with
    default role Viewer; admin promotes later.
  - **Claim-based role mapping**: config maps IdP group/role claims to Componode
    roles, with local admin override for exceptions.
- **Both coexist**: local-auth users and OIDC users share the same session
  table, the same RBAC, the same user model.

**Rationale**: Removes the "you must bring an IdP" friction while still letting
enterprises wire in their existing IdP. The Grafana/Backstage/Supabase pattern.
The gap-analysis §1/§2 work (server-side sessions, logout revocation, login
rate limiting) becomes real v1 work, not remediation.

---

## Engineering & Ops

### ADR-028 — Deployment: Docker Compose only for v1

**Context**: The prior project targeted Kubernetes via Kustomize. For an OSS
v1, the deployment surface should be minimal.

**Decision**: **Docker Compose only for v1.** `docker compose up` brings up
Postgres + backend + frontend. K8s/Helm packaging is a community-contributed
follow-on.

**Rationale**: One path that works, not two paths where one is perpetually
half-maintained. `docker compose up` is the OSS self-hosted default (Grafana,
Backstage, Plausible, Posthog). A community member who wants Helm will
contribute it.

---

### ADR-029 — Testing: shared importer harness + integration tests

**Context**: The testing strategy is part of the contributor contract.

**Decision**: **A+ + B.**
- **Importer packages**: unit tests against a shared harness that enforces the
  `DiscoveredAsset` contract (valid `category`/`provider`, stable `externalId`,
  required fields present). Contributors get a failing test for free if their
  importer yields malformed assets.
- **`packages/backend`**: integration tests (testcontainers Postgres) for the
  core upsert/dedup/edge-rewrite/hierarchy path.
- **E2e**: deferred to post-v1.

**Rationale**: The shared harness is what makes the importer contract
enforceable — a contributor runs `pnpm test` and the harness tells them their
`DiscoveredAsset` records are malformed without a maintainer reviewing for
that. Integration tests for the core path (the maintainers' responsibility)
catch schema/query bugs.

---

### ADR-030 — Documentation: README + docs/ folder, Markdown only

**Context**: For an OSS project, docs are the product.

**Decision**: **README + `docs/` folder, Markdown only.** Priority docs:
- `docs/importer-development.md` — the contributor contract (`Importer`
  interface, `DiscoveredAsset` shape, `SecretResolver` pattern, reference-
  importer walkthrough, test harness usage).
- `docs/data-model.md` — schema, entities, relationships.
- `docs/deployment.md` — Docker Compose self-hosting.

Generated docs site (Docusaurus/VitePress/Starlight) is post-v1.

**Rationale**: v1's doc audience is contributors and self-hosters, both served
well by Markdown in the repo. GitHub's own Markdown rendering + repo search is
enough. Migrating to a docs site later is a one-day job (content stays, you add
a config + nav).

---

### ADR-031 — CI/CD: GitHub Actions + changesets

**Context**: CI is what enforces the importer contract at the gate.

**Decision**: **GitHub Actions (lint + typecheck + unit + integration) +
changesets (automated versioning/changelog/npm publish).**
- Lint + typecheck + unit tests (with importer harness) on every PR.
- Integration tests on PR + push to main.
- Changesets: contributors add a changeset describing their change; merges to
  main auto-publish updated packages to npm with generated changelogs.

**Rationale**: Without CI gating the importer contract, the harness is just a
local suggestion. Changesets removes the release bottleneck — this is how
Backstage, Turborepo, and most modern TS monorepos ship.

---

### ADR-032 — Observability: full (Pino + Prometheus + OpenTelemetry)

**Context**: A tool that runs scheduled importers and holds cloud credentials
needs observability.

**Decision**: **Full observability in v1:**
- **Pino** structured logging (every request, importer run, auth event →
  structured JSON to stdout).
- **Prometheus `/metrics`** endpoint (`importer_runs_total`,
  `importer_run_duration_seconds`, `importer_run_failures_total`,
  `db_query_duration_seconds`).
- **OpenTelemetry tracing** (importer runs → DB query spans).

**Rationale**: The importer framework is instrumented for tracing from day one,
which is the right time to add it (before there are 7 importers to retrofit).
Deployers wire it into their existing stack via stdout + scrape + OTLP collector.

---

## Relationship Type Set (v1)

| Relationship | From → To | Semantic | Cardinality |
|---|---|---|---|
| `COMPOSES` | DigitalProduct → DigitalProduct | Parent composes child (hierarchy) | Child has one parent; parent has many children |
| `CONSUMES_FROM` | DigitalProduct → DigitalProduct | Business product consumes shared platform product | Many consumers, one platform |
| `DEPENDS_ON` | DigitalProduct → Component | Product depends on component | Many-to-many |
| `DEPENDS_ON` | Component → Component | Component depends on component (shared deps) | Many-to-many |
| `SOURCES_FROM` | Component → Component | Code provenance (service → repository) | Many-to-many |
| `EXPOSES` | Component → Component | Service exposes an API | Many-to-many |
| `HAS_INSTANCE` | Component → ComponentInstance | Component deployed in an environment | One-to-many |
| `OWNS` | LineOfBusiness → DigitalProduct | LOB owns product | One-to-many |
| `OWNS` | Team → DigitalProduct / Component | Team owns product/component | One-to-many |
| `BELONGS_TO` | Person → Team | Person belongs to team | Many-to-one |

---

## v1 Scope Summary

**In scope:**
- pnpm + Turborepo monorepo (`packages/core`, `packages/backend`,
  `packages/frontend`, 7 importer packages)
- PostgreSQL + Kysely + Kysely migrations
- Fastify backend with RBAC, server-side sessions, login rate limiting
- Built-in local auth + optional OIDC (JIT provisioning, claim-based role mapping)
- React + Vite + TanStack Query + Tailwind + shadcn/ui frontend
- 24-category component taxonomy + provider enum + free-form `resourceType`
- `ComponentInstance` entity for environment-specific deployments
- Composable Product Model: `DigitalProduct` (BUSINESS_CAPABILITY / PLATFORM /
  CUSTOMER_FACING) with `COMPOSES` / `CONSUMES_FROM` / `DEPENDS_ON`
- Full guided Platform Product workflow (detect → promote → rewrite edges →
  assign owner)
- Ownership graph: `LineOfBusiness` + `Team` + `Person`
- Importer framework: in-tree, code-registered, pull-only `AsyncGenerator`,
  scheduled + on-demand, external secret stores
- 7 importers: GitHub, AWS, Azure, Kubernetes, Web URL, API URL, MCP server
- Docker Compose deployment
- Testing: shared importer harness + integration tests (testcontainers)
- Docs: README + `docs/` (importer-development, data-model, deployment)
- CI/CD: GitHub Actions + changesets
- Observability: Pino + Prometheus + OpenTelemetry

**Out of scope (deferred):**
- `Risk` entity and security-findings importers (later phase with ASPM)
- Scoring-engine fields (EPSS, KEV, CARS, SSVC, loss-model)
- Importer-declared candidate product edges (v2: staged, human-confirmed)
- Per-env blast-radius traversal (Phase 4+)
- Kubernetes/Helm packaging (community-contributed)
- E2e tests (post-v1)
- Generated docs site (post-v1)
- Runtime-loaded importer plugins (post-v1)
- Remaining providers (GitLab, Bitbucket, Azure DevOps, Alibaba Cloud,
  Cloudflare, OpenShift, Docker/Podman) = contributor-welcome issues
