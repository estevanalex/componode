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
        status: enum[RUNNING, STOPPED, ERROR, GONE, ...],
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
(`RUNNING`/`STOPPED`/`ERROR`/`GONE`) on the instance (is this currently
running). These must not be conflated.

> **CORRECTION (Session 2, ADR-082)**: This ADR covers Case A only (single
> source asset with multiple environment-specific deployments → one
> `Component` with multiple `ComponentInstance` records). Case B (multiple
> distinct source assets considered the same logical component by a human) is
> handled via `ComponentGroup` — see ADR-082. The `GONE` status value was
> added by ADR-035 for orphaned instances.

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

> **CORRECTION (Session 2, ADR-049)**: The original "Relationship Type Set"
> table at the end of this file listed `COMPOSES` cardinality as "Child has
> one parent; parent has many children" (tree). This was incorrect.
> `COMPOSES` is a **DAG** — a child can have many parents (a shared platform
> product composed into multiple business capabilities). See ADR-049 for the
> full rationale and the cycle-detection strategy (ADR-050). The relationship
> table below has been updated.

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
| `COMPOSES` | DigitalProduct → DigitalProduct | Parent composes child (hierarchy) | **DAG**: child has many parents; parent has many children (ADR-049) |
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

---

## Session 2 — 2026-08-16 Grilling (Decisions Q1–Q51)

> The following 51 decisions (ADR-033 through ADR-083) were ratified in the
> second grilling session. They fill gaps left by Session 1 and refine
> ambiguities in the ratified ADRs. ADR-018's `COMPOSES` cardinality is
> corrected in place (see edit below). These decisions are binding for v1.

### ADR-033 — Person/UserAccount unification

**Context**: ADR-020 defines `Person BELONGS_TO Team` (ownership graph);
ADR-027 defines `UserAccount` (auth principal). Two names for what may be one
concept.

**Decision**: **Unified — `Person` IS `UserAccount`.** One entity with nullable
auth columns (`passwordHash` for local-auth users, `oidcSubject` for OIDC
users). A person may own things without ever logging in (nullable auth); a
person who logs in has auth columns set. The Backstage `User` model.

**Rationale**: Single-org removes multi-tenant pressure forcing separation.
Ownership and login are two roles of one human. Nullable auth handles "owns
something but doesn't log in." A separate `UserAccount` adds a join to every
ownership query for no benefit.

---

### ADR-034 — ComponentInstance upsert key

**Context**: ADR-025 defines component upsert by `(category, provider,
externalId)` but is silent on instance matching across runs.

**Decision**: **`(componentId, instanceExternalId)`.** Importers provide a
stable per-instance `externalId` (e.g. AWS API Gateway Stage ARN, K8s pod
name, web URL hash). `environment` is an attribute, not part of the key.

**Rationale**: Scales to multiple instances per environment (an API Gateway
with three `PRODUCTION` stages); doesn't force a display attribute (`region`/
`url`) into the identity role; mirrors the component's own upsert key pattern.

---

### ADR-035 — Instance reconciliation: orphan missing instances

**Context**: An importer yields a component with `instances[]`. What happens to
instance rows from a previous run that are absent from the current yield?

**Decision**: **Orphan the missing instances — set `status = GONE`, keep the
row, add `lastSeenAt`/`lastSeenInRunId`.** Re-appearance next run flips
`status` back.

**Rationale**: Matches ServiceNow CMDB, cartography, AWS Config (retain
retired records with status flip, not hard-delete). Resilient to transient API
failures. Preserves blast-radius/audit value. `ComponentInstance.status` gains
`GONE` (ADR-014's `...` was always meant to grow).

---

### ADR-036 — Two-phase reconciliation scope

**Context**: Q35's orphan logic needs a scope boundary — what set of existing
rows do we compare the current yield against?

**Decision**: **Two phases.** (1) Per-component during the run: orphan
`ComponentInstance` rows absent from the yielded `instances[]`. (2) At
successful run end: components previously touched by this importer config but
not yielded this run get `Component.lifecycle = RETIRED`, cascading to orphan
their instances. Phase 2 only runs if `import_runs.status = COMPLETED`.

**Rationale**: Phase 1 handles instance-level disappearance; phase 2 handles
whole-component disappearance (terminated EC2 instance no longer yielded).
Uses `ComponentInstance.status` and `Component.lifecycle` for their designed
purposes. Partial-run risk mitigated by gating phase 2 on successful
completion.

---

### ADR-037 — Importer run commit strategy

**Context**: An importer run yields thousands of assets. What is the
transaction boundary?

**Decision**: **Per-asset incremental commits + phase-2 gated on `COMPLETED`.**
Each yielded asset upserts in its own transaction. Phase-2 reconciliation
(ADR-036) only runs if the importer run completes successfully. A failed run
leaves a partial inventory; the next successful run's phase 2 cleans up.

**Rationale**: Survives real-world importer scales (AWS accounts with tens of
thousands of resources) without holding a multi-minute transaction. Preserves
the ADR-036 invariant that reconciliation only happens on a complete view.

---

### ADR-038 — Importer run resume strategy

**Context**: ADR-037's incremental commits enable resume. But "where it left
off" needs a precise definition given importers are non-deterministic
generators.

**Decision**: **Run-level restart — re-run from zero, rely on upsert
idempotency.** No checkpoint state. A failed run is retried from the beginning;
re-processing already-committed assets is a no-op (same upsert key). Resume =
retry.

**Rationale**: Keeps the importer contract unchanged (`AsyncGenerator<
DiscoveredAsset>`, nothing more). Upsert idempotency makes re-running safe.
The cost (re-pulling from source API on failure) is bounded — most failures
are early (auth, config), not late. Large accounts should split importer
configs per region for parallelism, not complicate the contract.

---

### ADR-039 — Importer trigger auth boundary

**Context**: ADR-022 says scheduled + on-demand. ADR-027 defines RBAC. Who can
trigger runs and configure importers?

**Decision**: **Admin owns config; Editor+Admin can trigger.** Admins
create/edit importer configs (credentials, schedule, scope — the
security-sensitive part). Editors can trigger on-demand runs of existing,
already-vetted configs. Viewers see run history. One in-flight run per
importer config (return `409 Conflict` if already running).

**Rationale**: Separates the security boundary (config = Admin) from the
operational boundary (run = Editor). A Viewer-triggered runaway is a DoS
vector against the deployer's API quota; the per-config in-flight guard
prevents it regardless of role.

---

### ADR-040 — Importer config storage

**Context**: "Importer config" appeared across ADR-022–026 but was never
defined as an entity.

**Decision**: **Single `importer_configs` table, scope/secretRefs as JSONB.**
One row per config: `id`, `importerName`, `label`, `schedule` (cron, nullable),
`scope` (JSONB, importer-specific), `secretRefs` (JSONB array), `enabled`.
Each importer package declares its config schema (JSON Schema) for validation
+ dynamic form rendering.

**Rationale**: The importer-specific variance is what JSONB is for. The core
never queries `scope` by field — it passes `scope` opaquely to the importer,
which validates against its declared schema. Single table serves "list all
configs," "get by id," "find by importerName."

---

### ADR-041 — Importer registry discovery

**Context**: ADR-024 says "auto-discovered at boot via a registry" but doesn't
specify the mechanism.

**Decision**: **Each importer package exports a manifest; the backend declares
them as deps; the registry imports manifests by package name, resolves
`implPath` lazily at run time.** `packages/importer-aws/package.json` exports
`"./manifest"` with `{name, configSchema, implPath}`. The registry has a
static list of package names (one line per importer, not a merge hotspot).
Unused importers don't load their heavy SDKs at boot (lazy `implPath`).

**Rationale**: Satisfies "auto-discovered" without runtime filesystem
fragility or a codegen step. Explicit dependency declaration. Matches how
Backstage plugins are resolved (package dependency + plugin manifest export).

---

### ADR-042 — Frontend importer schema delivery

**Context**: The frontend needs to render the "Add importer config" UI from
each importer's config schema.

**Decision**: **`GET /api/v1/importers` returns the manifest list (name, label,
description, configSchema as JSON Schema).** The frontend renders forms
dynamically with a shadcn-compatible renderer. One schema validates (backend)
+ renders (frontend) — no drift.

**Rationale**: Adding an importer is a backend-only change; the UI adapts
automatically. Forces importer authors to declare a proper JSON Schema, which
doubles as the backend's validation schema. A generic JSON-Schema form is
functional and consistent for v1; custom widgets are a v1.1 enhancement.

---

### ADR-043 — Session storage

**Context**: ADR-027 mandates server-side, revocable sessions but doesn't
specify storage.

**Decision**: **Postgres `sessions` table.** `sessions(id, userId, createdAt,
lastSeenAt, expiresAt, revokedAt)`. Each authenticated request loads the
session by indexed PK (sub-millisecond), checks `revokedAt IS NULL` and
`now() < expiresAt`, updates `lastSeenAt` (write-throttled to once per 60s).
Revocation = `UPDATE ... SET revokedAt`. "Revoke all for user" = `WHERE userId
= ?`.

> **CORRECTION (Session 2, ADR-099)**: `sessions.id` is a **32-byte
> cryptographically random token** (base64url-encoded), NOT a UUID v7. This
> is an exception to ADR-045's "UUID v7 for all entities" — session tokens
> are credentials (the cookie value), not entity identifiers, and require
> cryptographic randomness (256-bit). UUID v7's 74 bits of randomness is
> brute-force infeasible but not the standard for session tokens. The
> `sessions.id` column is `text` (not `uuid`) to hold the base64url token.

**Rationale**: Satisfies "checked on every request" + "revocable" without
adding Redis. A session lookup by indexed PK is sub-millisecond on Postgres;
v1 is a single-org internal tool, not a high-traffic public site. "List active
sessions" and "revoke all for user" are trivial queries. An in-process LRU
cache is an additive optimization if needed later.

---

### ADR-044 — Password hashing

**Context**: ADR-027 says "username/password" but doesn't specify the scheme.

**Decision**: **Argon2id via `@node-rs/argon2`, PHC-format storage.** OWASP
primary recommendation, memory-hard (GPU-resistant), no 72-byte truncation
footgun. `@node-rs/argon2` ships prebuilt binaries for Windows/Linux/macOS/
arm64.

**Rationale**: OWASP primary. `@node-rs/argon2` has first-class Windows
prebuilt support (AGENTS.md notes Windows as the OS environment). PHC-format
storage enables per-user rehash-on-login migration if the scheme ever changes
— but starting with Argon2id means no migration for years.

---

### ADR-045 — Entity identifier format

**Context**: AGENTS.md says "UUID v7 or ULID" — an unresolved either/or.

**Decision**: **UUID v7, stored as native Postgres `uuid`.** 48-bit
Unix-millisecond timestamp + 74 bits randomness, RFC 9562. The `slug` column
(AGENTS.md) handles human-readable URL references; ULID's Base32 readability
buys nothing.

**Rationale**: PostgreSQL's native `uuid` type is 16 bytes, natively indexed,
universally recognized by tooling. UUID v7's time-sortability satisfies
"time-sortable identifier." ULID-as-text is 26 bytes (~63% larger) with no
benefit when `slug` exists for human-readable refs.

> **EXCEPTION (Session 2, ADR-099)**: `sessions.id` is NOT a UUID v7. It is
> a 32-byte cryptographically random token (base64url-encoded `text` column).
> Session tokens are credentials (the cookie value), not entity identifiers,
> and require 256-bit cryptographic randomness. See ADR-043/ADR-099 for
> details.

---

### ADR-046 — Slug generation and uniqueness

**Context**: AGENTS.md mandates `slug` on `DigitalProduct`, `Component`,
`ComponentInstance` but doesn't define generation or collision handling.

**Decision**: **Hybrid by entity type.** `DigitalProduct`: user-owned manual
slug, validated, collision-rejected with "choose another." `Component`/
`ComponentInstance`: importer-derived slug (from `name`/`externalId`), silent
suffix-collision (`-2`, `-3`). DB unique constraint enforced either way.

**Rationale**: Matches the curation asymmetry (ADR-019): products are
low-volume, high-curation (manual slugs); components are high-volume,
importer-driven (auto-generation). Editing an importer-managed slug creates
churn (the importer re-derives it next run).

---

### ADR-047 — Deletion model

**Context**: ADRs define `lifecycle`/`status` but never specify "delete"
across the schema.

**Decision**: **`lifecycle`/`status` are the soft-delete for graph entities;
hard-delete for operational entities.** `DigitalProduct`/`Component` use
`lifecycle=RETIRED`; `ComponentInstance` uses `status=GONE`; `ComponentGroup`
uses `lifecycle=RETIRED`. `importer_configs`, `sessions`, `import_runs`,
`Person`, `Team`, `LineOfBusiness` are hard-deletable. Bulk-retire-by-config
("retire all components last touched by config X") is an admin feature on top.

**Rationale**: `lifecycle` and `status` *are* the soft-delete mechanism for
graph entities — adding a separate `deletedAt` creates a redundant field with
unclear semantics. Hard-delete for non-graph entities is correct (a deleted
user's session shouldn't linger). GDPR "delete my account" = hard-delete
`Person` after reassigning ownerships.

---

### ADR-048 — Graph relationship persistence

**Context**: ADR-016 defines 10 relationship types. ADR-006 chose Postgres
over Neo4j — edges must be tables.

**Decision**: **FKs for 1-to-many; typed junction tables with CHECK constraints
for many-to-many; no polymorphic `edges` table.** `HAS_INSTANCE` (component→
instance), `OWNS` (LOB/team→product/component), `BELONGS_TO` (person→team) are
FKs on the owned entity. `COMPOSES`, `CONSUMES_FROM`, `DEPENDS_ON` (product→
component), `DEPENDS_ON` (component→component), `SOURCES_FROM`, `EXPOSES` get
junction tables with typed FKs and per-relationship CHECK constraints.

**Rationale**: Uses the correct relational primitive for each cardinality.
Junction tables for 1-to-many are an anti-pattern. The ADRs already enumerate
the exact 10 relationship types (fixed set), so a polymorphic `edges` table's
"zero-schema-change" benefit is moot. Full referential integrity; per-
relationship indexes; CHECK constraints for composition rules (ADR-018).

---

### ADR-049 — COMPOSES hierarchy: DAG with unlimited depth

**Context**: ADR-018's relationship table says "Child has one parent" (tree),
but the Composable Product Model's reuse intent implies a shared platform
product can be composed into multiple parents (DAG).

**Decision**: **`COMPOSES` is a DAG (many parents per child); unlimited depth;
write-time cycle detection.** A shared platform product can be composed into
multiple business capabilities. Cycle detection is a write-time validation
(reject `COMPOSES` edge that would create a cycle), not a read-time problem.
**This corrects ADR-018's "one parent per child" cardinality — see the in-place
edit to ADR-018 below.**

**Rationale**: The Composable Product Model's entire value is reuse. A tree
forces duplication of shared products or forces everything into
`CONSUMES_FROM` (restricted to `PLATFORM` targets). A DAG with write-time
cycle detection eliminates the infinite-recursion risk. Recursive CTEs with
cycle detection (`WHERE NOT path @> ARRAY[current]`) are a well-trodden
Postgres pattern. If query performance on deep hierarchies becomes an issue,
a materialized path (`ltree`) is an additive optimization — but `ltree`
models tree paths, not DAG paths, so it can't be used directly.

---

### ADR-050 — COMPOSES cycle detection implementation

**Context**: ADR-049 mandates write-time cycle detection. How is it
implemented?

**Decision**: **`BEFORE INSERT` trigger on `product_composes` runs a DFS cycle
check.** The trigger executes a recursive CTE ("starting from `childId`, can I
reach `parentId` by following existing `COMPOSES` edges?") within the insert's
transaction. If a cycle would be created, raise a structured exception. The
application catches the exception and returns `409 Cycle detected` with the
cycle path.

**Rationale**: Race-safe (the trigger runs within the insert's transaction,
holding the row lock). Un-bypassable (bugs in application code can't skip it).
A cycle in `COMPOSES` breaks every hierarchy query (infinite recursion in the
CTE from ADR-051), so the invariant must be DB-enforced. The DFS is fast for
typical hierarchy depths with indexes on `(parentId)` and `(childId)`. If
latency becomes a problem at scale, a materialized-path cache (a `text[]` of
ancestor IDs maintained by trigger) is an additive optimization.

---

### ADR-051 — Hierarchy traversal: merged CTE with edge types

**Context**: `COMPOSES` and `CONSUMES_FROM` both build the product hierarchy.
Do they form one merged graph or two separate graphs in queries?

**Decision**: **Merged recursive CTE over `COMPOSES` + `CONSUMES_FROM`,
emitting `edgeType` per hop.** One query, full hierarchy, but the caller can
distinguish how each descendant was reached (for UI coloring, filtering,
governance rules). The recursive term is a `UNION ALL` of the two edge tables,
with an `edgeType` literal in each branch.

**Rationale**: The user's mental model is one hierarchy ("everything under
Checkout"). Silent merge loses semantic information that matters (the Platform
Product workflow rewrites `DEPENDS_ON` into `CONSUMES_FROM`; the governance
value is in *seeing* which dependencies are platform-consumed vs.
directly-composed). Future-proofs: a third hierarchy edge type adds one more
`UNION ALL` branch, not a new query.

---

### ADR-052 — Audit model: three-tier

**Context**: The ADRs define `createdBy`/`lastSeenAt` but no unified audit
model. For a tool that curates an asset graph, "who changed what and when" is
a real operational + compliance need.

**Decision**: **Three-tier audit.**
1. **Run-summary for importers** — `import_runs` records `assetsProcessed`,
   `assetsCreated`, `assetsUpdated`, `instancesOrphaned`, `componentsRetired`
   per run.
2. **Transition-level `entity_changes`** — logs consequential importer state
   changes (`lifecycle` flips, `status` flips, new component discovered) + all
   human entity edits. Routine attribute re-upserts are NOT logged.
3. **`edge_changes`** — logs all edge mutations (`COMPOSES`/`CONSUMES_FROM`/
   `DEPENDS_ON`/`SOURCES_FROM`/`EXPOSES`/`OWNS`/`BELONGS_TO` ADDED/REMOVED)
   with an optional `reason` field.

> **UPDATE (Session 2, ADR-100)**: The audit tables (`entity_changes`,
> `edge_changes`, `import_run_errors`) are **append-only** — enforced by
> `BEFORE UPDATE OR DELETE` triggers that raise an exception
> unconditionally. No role (including Admin) can modify or delete audit
> entries. Corrections are new entries (`action: CORRECTION`, referencing
> the original entry's ID). `import_runs` is NOT append-only but is
> immutable after terminal state (`COMPLETED`/`FAILED`/`CANCELLED`/
> `INTERRUPTED`) via a `BEFORE UPDATE` trigger. `entity_changes` and
> `edge_changes` carry denormalized `createdByName`/`updatedByName`
> snapshots (captured at write time) for historical context. The
> `createdBy`/`updatedBy` FKs to `persons` are `ON DELETE SET NULL` (when a
> person is hard-deleted per ADR-047, the audit entry's FK is nulled but
> the name snapshot retains the name — a deliberate tradeoff of audit
> integrity vs. right-to-be-forgotten). No retention policy in v1.

**Rationale**: Matches the curation asymmetry (ADR-019): the meaning layer
(edges, ownership, composition) is human-judgment, high-value, low-frequency —
audit it fully. The factual layer (component attributes) is importer-driven,
high-frequency, low-judgment — logging every import-driven attribute change is
noise. The transition-logging answers "what did this importer run change that
matters?" at row granularity, while the run summary answers "what was the
overall blast radius?"

---

### ADR-053 — API authorization: layered default-deny

**Context**: ADR-027 defines RBAC. How are routes enforced?

**Decision**: **Global default-deny `preHandler` with route-pattern RBAC map
(role gates) + explicit `assertCan*(userId, resourceId)` ownership checks in
the service layer.** Every route requires auth by default; a central RBAC map
declares `(HTTP method, route pattern) → minimum role`. Routes not in the map
are `403` by default. Ownership-sensitive operations get additional service-
layer checks.

**Rationale**: Default-deny is the secure posture (a forgotten `preHandler` on
a new route fails closed, not open). Full ABAC is overkill for v1's three
roles, but the ownership dimension (ADR-020) can't be expressed by route-level
role checks alone. Layered: route gate handles the 90% case; service gate
handles the 10% that needs resource context.

---

### ADR-054 — RBAC permission matrix

**Context**: ADR-027 names three roles but never enumerates permissions.

**Decision**: **Matrix approved as proposed in Q22.**

| Action | Viewer | Editor | Admin |
|---|---|---|---|
| View all entities, hierarchy, audit log | ✅ | ✅ | ✅ |
| View importer configs + run history | ✅ | ✅ | ✅ |
| Trigger on-demand importer run | ❌ | ✅ | ✅ |
| Create/edit/retire `DigitalProduct` | ❌ | ✅ | ✅ |
| Author/edit `COMPOSES`/`CONSUMES_FROM`/`DEPENDS_ON` edges | ❌ | ✅ | ✅ |
| Author/edit `OWNS`/`BELONGS_TO` edges | ❌ | ✅ | ✅ |
| Manually edit `Component.lifecycle` | ❌ | ✅ | ✅ |
| Manually edit `Component` attributes | ❌ | ✅ | ✅ |
| Create/edit `LineOfBusiness`/`Team` | ❌ | ❌ | ✅ |
| Create/edit `Person` (user management) | ❌ | ❌ | ✅ |
| Create/edit/delete `importer_config` | ❌ | ❌ | ✅ |
| View all sessions | ❌ | ❌ | ✅ |
| Revoke sessions (self or any) | self only | self only | ✅ any |
| Configure OIDC integration | ❌ | ❌ | ✅ |
| Bulk-retire components by importer config | ❌ | ❌ | ✅ |

**Rationale**: Viewer is strictly read-only (safest default for OIDC JIT-
provisioned users). Editor owns the meaning layer (architect/curator). Admin
owns everything including destructive/organizational actions. Session
revocation is self-service for Viewer/Editor; Admin can revoke anyone's.

---

### ADR-055 — Importer secret resolution

**Context**: ADR-023 defines a `SecretResolver` interface. ADR-025's signature
passes `secretResolver` to the importer. Q23 decided the importer receives
pre-resolved secrets, not a resolver. These are inconsistent.

**Decision**: **`secretRefs: [{key, env? | file?}]` on `importer_configs`.**
The core dispatches on which field is present (`env` → env resolver, `file` →
file resolver), resolves all `secretRefs` before invoking the importer, and
passes `secrets: Record<string, string>` to the importer. The importer never
knows which resolver was used.

**Rationale**: Importer is simpler (no resolver dependency, just a map lookup).
The core enforces the allow-list (only declared `secretRefs` are resolved).
Secrets are resolved once, not per-importer-call. Avoids string parsing
(fragile on Windows paths). Extends cleanly (a future `vault` resolver adds a
`vault` field).

---

### ADR-056 — Importer interface signature (supersedes ADR-025)

**Context**: ADR-025 says `run(config, secretResolver)`. ADR-055 pre-resolves
secrets. The signature needs reconciliation + observability/cancellation
hooks.

**Decision**: **`run(config, secrets, context): AsyncGenerator<DiscoveredAsset>`
where `context = {runId, logger, signal, reportPhase, tracer?}`.** `config` is
the typed scope from `importer_configs.scope` (validated against the
importer's declared schema). `secrets` is the resolved `Record<string,
string>`. `context.logger` is the abstracted `Logger` from `core` (ADR-067).
`context.signal` is an `AbortSignal` for cancellation (ADR-058).
`context.reportPhase(name)` updates `import_runs.currentPhase` for progress
(ADR-060). `context.tracer?` is an optional abstracted `Tracer` for opt-in
child spans (ADR-068). **This supersedes ADR-025's `run(config, secretResolver)`
signature.**

**Rationale**: Pre-resolved `secrets` replaces `secretResolver` (ADR-055).
`config` is just the `scope` (the importer doesn't need operational fields).
`context` is the necessary addition: ADR-032 mandates Pino + OTel from day
one; the importer needs a logger to participate; `AbortSignal` is essential
for "admin cancels a runaway run"; `runId` enables log correlation;
`reportPhase` enables progress reporting without contract pollution.

---

### ADR-057 — DiscoveredAsset final shape (supersedes ADR-025)

**Context**: ADR-025 defined `DiscoveredAsset` with `instances?` and
`relationships?` (reserved for v2). Q2–Q4 refined instance reconciliation.

**Decision**: **Final `DiscoveredAsset` shape:**

```typescript
interface DiscoveredAsset {
  category: ComponentCategory;
  provider: ComponentProvider;
  externalId: string;
  name: string;
  resourceType?: string;
  slug?: string;                     // importer-suggested (ADR-046: core may suffix)
  details?: Record<string, unknown>;
  instances?: ComponentInstanceData[];
  // relationships[] removed from v1 contract (ADR-019: manual hierarchy for v1)
}

interface ComponentInstanceData {
  externalId: string;                // required (ADR-034: upsert key)
  environment: ComponentEnvironment; // required (ADR-014 enum)
  url?: string;
  region?: string;
  status?: ComponentInstanceStatus;  // optional (importer may not know)
  version?: string;
  deployedAt?: Date;
  rawConfig?: Record<string, unknown>;
}
```

**Rationale**: `relationships[]` removed entirely from v1 (not just reserved)
— adding importer-declared edges would expand the contract surface for a v2
feature. `slug?` added as importer-suggested (ADR-046). `ComponentInstanceData.
externalId` required (ADR-034). `environment` required (prevents null-env
pollution). `status` optional (importer may not know operational state).

---

### ADR-058 — Importer cancellation

**Context**: ADR-056 added `signal: AbortSignal` to the context. How does
cancellation flow?

**Decision**: **`AbortController` for live signal + `cancelRequestedAt` column
on `import_runs` for durability.** The cancel endpoint sets
`cancelRequestedAt` (durable record) AND calls `controller.abort()` (immediate
signal). The importer observes the `AbortSignal` for mid-SDK-call interruption
(passes `signal` to `fetch`/`@aws-sdk`/`octokit` natively). On backend restart,
the recovery loop: `status = RUNNING AND cancelRequestedAt IS NOT NULL` →
`CANCELLED`; `status = RUNNING AND cancelRequestedAt IS NULL` → `INTERRUPTED`.

**Rationale**: Two mechanisms serve different failure modes (live cancel vs.
crash recovery). `AbortController` is the right primitive for immediate,
mid-SDK-call interruption. `cancelRequestedAt` is the right primitive for
durability — if the backend crashes between the cancel API call and the abort
reaching the importer, the flag survives. The distinction matters for the
audit log (ADR-052): "admin cancelled run X" vs. "backend crashed during run
X" are different operational events.

---

### ADR-059 — Importer run state machine

**Context**: Across ADR-037, ADR-054, ADR-058 we referenced several run
statuses. The full state machine needs to be pinned down.

**Decision**: **`PENDING → RUNNING → {COMPLETED, FAILED, CANCELLED,
INTERRUPTED}`.** `PENDING` = run created, importer not yet invoked. `RUNNING`
= generator active. `COMPLETED` = importer finished, all assets committed,
phase-2 done (the only status that triggers phase-2 reconciliation per
ADR-036/ADR-037). `FAILED` = importer threw or per-asset commit failed
irrecoverably (process alive, error captured). `CANCELLED` = admin cancelled
or restart found `cancelRequestedAt`. `INTERRUPTED` = backend crashed mid-run,
no cancel requested (set by the restart recovery loop). No `PAUSED` state —
cancellation is terminal; start a new run to retry (ADR-038).

**Rationale**: `COMPLETED` is the only status that triggers phase-2 (preserves
the ADR-036 invariant). `FAILED` vs `INTERRUPTED` distinguishes "code bug"
(process alive, error captured) from "infra event" (process gone) — matters
for ops triage. `PENDING` exists because the trigger API may create the run
record before the importer is invoked. No `PAUSED` avoids pause/resume
complexity.

---

### ADR-060 — Importer run coordination

**Context**: ADR-022 says scheduled + on-demand. How is a run actually
started?

**Decision**: **`202 Accepted` + `{runId}`; bounded in-process queue;
`PENDING`-on-restart → `INTERRUPTED`; clients poll for status.** Both
scheduler and HTTP trigger call a shared `RunService.start(configId,
triggeredBy)`, which checks the in-flight guard (ADR-039: one per config,
`409`), creates a `PENDING` row, enqueues into a bounded queue (ADR-061). The
HTTP response is `202` with `{runId}` — the client polls
`GET /api/v1/importers/:configId/runs/:runId`. `PENDING` runs that survive a
restart are marked `INTERRUPTED` (not re-enqueued — re-enqueuing on restart
could trigger a storm if the backend flaps).

**Rationale**: `202 + poll` is the standard for long-running operations (GitHub
Actions, AWS). A bounded queue prevents the thundering-herd problem (10 cron
configs aligning). Re-enqueuing on restart is dangerous (flap storm);
`INTERRUPTED` lets the next cron tick or manual trigger re-run cleanly. SSE/
WebSocket push is post-v1; polling every 2-3s is adequate for a "refresh AWS"
interaction that takes 30-60s.

---

### ADR-061 — Importer queue concurrency

**Context**: ADR-060 established a bounded queue. What is the concurrency
limit?

**Decision**: **`IMPORTER_MAX_CONCURRENCY` env var, default 3, global
semaphore across configs.** Per-config guard (ADR-039) already enforces
1-per-config, so the only meaningful knob is the global limit. Restart to
change (concurrency limits are infrastructure-sizing decisions).

**Rationale**: Default 3 is conservative for a fresh Docker Compose deployment
(Postgres default `max_connections = 100`, backend pool ~10, leaving
headroom). Env-var approach matches the "deployer brings infra" posture. A
deployer who knows their Postgres has `max_connections = 50` can tune down.
No per-config concurrency field (it's always 1 per ADR-039).

---

### ADR-062 — Importer run progress reporting

**Context**: ADR-060's poll returns status. But status alone doesn't tell the
user *where* the run is.

**Decision**: **Poll returns `{status, assetsProcessed, currentPhase?}`.
`context.reportPhase(name)` callback on the run context (ADR-056). No
estimated total.** `assetsProcessed` is the raw count (incremented per-asset
commit per ADR-037). `currentPhase` is an optional string the importer updates
via the callback. The UI shows "Running… Scanning RDS · 1,247 assets" — phase
gives qualitative context, count gives scale, no fake percentage.

**Rationale**: An estimated total is false precision — AWS resource counts
shift mid-scan, GitHub repos are created/deleted, and a wrong estimate is
worse than no estimate. Phase + count gives enough to know it's working and
roughly where it is. `reportPhase` is a context callback, not a special yield
— the `AsyncGenerator<DiscoveredAsset>` contract stays clean. Importers that
don't implement it simply omit phases.

---

### ADR-063 — Importer error surfacing

**Context**: A run can fail in several ways. How are errors stored and
surfaced?

**Decision**: **Terminal error (`errorMessage`, `errorType`, `errorStack`) on
`import_runs` + non-terminal per-asset errors in `import_run_errors` table.**
The run-level fields capture the *terminal* error (the one that set `status =
FAILED`) with stack trace. `import_run_errors(id, runId, assetExternalId?,
errorType, message, occurredAt)` captures *non-terminal* errors (assets that
failed but the run continued — e.g. a malformed asset was skipped).

**Rationale**: The terminal error belongs on the run row (the answer to "why
did this run fail?" visible without a join). The stack trace is essential for
ops triage (ADR-059's `FAILED` vs `INTERRUPTED` — `FAILED` has an error,
`INTERRUPTED` doesn't). Non-terminal errors belong in a separate table (the
answer to "this run completed but 5 assets had problems, which ones?"). The
split is by error category (terminal vs non-terminal), the natural query
boundary.

---

### ADR-064 — Importer validation harness

**Context**: ADR-029 says "shared harness." What does it check and where does
it run?

**Decision**: **Shared `validateDiscoveredAsset` in `packages/core`; test-time
harness for contributor feedback + runtime validation in the core; invalid
assets logged to `import_run_errors` (ADR-063) and skipped.** Importer
packages use the harness in unit tests (catches issues during development).
The core uses the same function at runtime (catches issues from untested
importers or edge cases). One function, no drift.

**Rationale**: A's "trust the importer" is too fragile — one malformed run
corrupts the DB. Runtime-only loses ADR-029's test-time harness value
(contributors get no fast feedback). Both gives defense in depth + one source
of truth. The runtime cost is negligible (enum membership + required-field
presence + type checks, all in-memory, sub-millisecond per asset).

---

### ADR-065 — Package dependency graph

**Context**: ADR-012 defined the layout. What are the exact dependency edges?

**Decision**: **`packages/core` is the leaf (zero deps on other `@componode/*`
packages).** Importers depend on `core` only (NOT `backend`, NOT each other —
enforced by ESLint `no-restricted-imports`). `packages/backend` depends on
`core` + all 7 importer packages (manifest import per ADR-041).
`packages/frontend` depends on `core` (types only) — NOT `backend` (calls via
HTTP). Frontend serving: **one container** — the backend serves the frontend's
built static assets via `fastify-static` in production; the frontend runs its
own Vite dev server in dev with an API proxy.

**Rationale**: `core` as the leaf is the seam that keeps importers uniform.
The ESLint boundary rule (importers MUST NOT import `backend`) is enforceable
only if `core` is the sole shared dep. One container (backend serves
frontend) matches ADR-028's minimalism (Docker Compose = `postgres` + `app`);
a separate nginx container is an additive change later if needed.

---

### ADR-066 — Bootstrap admin

**Context**: A fresh deployment has an empty DB — no users, no way to log in.
ADR-027's OIDC JIT creates Viewers; no one can promote to Admin.

**Decision**: **Env-var bootstrap admin on fresh DB + CLI `promote-admin` for
recovery.** `BOOTSTRAP_ADMIN_USERNAME` + `BOOTSTRAP_ADMIN_PASSWORD` env vars
create the first Admin (Argon2id-hashed per ADR-044) when the DB is empty.
The env vars are only read when the DB is empty (subsequent boots ignore them
— safe to remove from `compose.yml` after bootstrap). A separate `pnpm
backend promote-admin --username X` CLI command exists for recovery (locked
out, or creating additional Admins without UI access).

**Rationale**: Env-var bootstrap is the standard pattern (Grafana, Supabase,
Postgres). The "password in env var" concern is mitigated by documenting
"change this password immediately via the UI after first login" and removing
the env var post-bootstrap. The CLI is the right escape hatch for "I locked
myself out" — requires container access (which the deployer has), not a
security bypass.

---

### ADR-067 — Logger abstraction

**Context**: ADR-056's context includes `logger`. ADR-032 mandates Pino. Do
importers receive raw `pino.Logger` or an abstraction?

**Decision**: **Abstracted `Logger` interface in `packages/core` with
`debug/info/warn/error(msg, meta?)` + `child(meta): Logger`.** The backend
implements it as a thin Pino wrapper. Importers depend only on `core`'s
interface (no `pino` dep). The backend creates a child logger scoped with
`{runId, importerName, configId}` and passes it to the importer, so every log
line automatically carries correlation IDs.

**Rationale**: Direct-Pino coupling means every importer carries a `pino`
dependency and is locked to Pino's API. The abstraction costs nothing (a
5-method interface) and buys decoupling + testability. The `child(meta)`
method is essential for run-correlation (ADR-032's tracing requires it) and
is a common logging pattern (Bunyan originated it; Pino/Winston/pino-http all
use it), not a Pino leak. The `Logger` interface lives in `core` (pure TS, no
runtime deps — ADR-065's invariant holds).

---

### ADR-068 — OpenTelemetry tracing integration

**Context**: ADR-032 mandates OTel. How do importers participate?

**Decision**: **Run-level span always created by core + abstracted `Tracer`/
`Span` interfaces in `core` (pure TS, no OTel dep) + opt-in child spans for
importers.** The backend's `RunService` starts an OTel span (`importer.run`)
before invoking `importer.run()`, sets span attributes (`runId`,
`importerName`, `configId`), ends it on finish/error/cancel. The context
includes an optional `tracer?: Tracer` — importers that want fine-grained
tracing call `context.tracer.startSpan("scan-ec2")`; importers that don't are
still traced at the run level. The backend implements `Tracer`/`Span` as OTel
wrappers.

**Rationale**: Satisfies ADR-032's "instrumented from day one" (run-level span
always there), ADR-065's "core has no runtime deps" (interfaces only, OTel
implementation in `backend`), and the contributor contract's "importers are
simple" (tracing is opt-in). The 7 v1 importers (core-team-written) use child
spans for rich traces; contributor importers get the run-level span for free.
The abstracted interfaces are 4-method (startSpan, end, setAttribute,
recordError) — minimal, testable with mocks.

---

### ADR-069 — Prometheus metrics

**Context**: ADR-032 lists example metrics. The exact set and labels need
pinning down.

**Decision**: **Metric set approved as proposed in Q48.** Importer metrics
(`componode_importer_runs_total{importer, status, trigger_reason}`,
`..._run_duration_seconds`, `..._assets_processed_total`, `..._assets_created
_total`, `..._assets_updated_total`, `..._instances_orphaned_total`,
`..._components_retired_total`, `..._run_errors_total{importer, error_type}`,
`..._queue_depth`, `..._active_runs`). HTTP metrics
(`componode_http_requests_total{method, route, status}`,
`..._request_duration_seconds`). DB metrics (`componode_db_query_duration_
seconds{operation}`, `..._pool_active_connections`, `..._pool_idle_connections
`). Auth metrics (`componode_auth_login_attempts_total{method, result}`,
`..._auth_active_sessions`). The `/metrics` endpoint is **unauthenticated**
(standard Prometheus scrape pattern), protected by being on a separate port
or path that the deployer's network policy restricts (documented in
`docs/deployment.md`).

**Rationale**: `importer` label is the importer name (low-cardinality, 7
values), not config ID (high-cardinality). `status` label uses terminal
statuses only (transient statuses would create series that never get a final
value). `route` label uses normalized route patterns (not raw paths with
UUIDs). No per-user/per-session labels (high-cardinality, security-relevant).
Histograms use Prometheus default buckets.

---

### ADR-070 — API versioning

**Context**: The ADRs don't specify API versioning.

**Decision**: **`/api/v1/...` prefix on all routes from day one.** The
frontend API client uses a base-path constant. When v2 is needed, new routes
are added at `/api/v2/...` and v1 routes are maintained or deprecated.

**Rationale**: The cost of adding `/v1` from the start is near-zero (one
base-path constant). The cost of *not* having it and needing it later is high
(retrofit versioning across every route, frontend, and any external client).
The Composable Product Model's API is a natural candidate for external
consumption (CLI tools, CI integrations). Standard practice (GitHub, Stripe,
Kubernetes all version from v1).

---

### ADR-071 — API error response format

**Context**: Q21 established RBAC. What is the error response shape?

**Decision**: **`{code, message, details?}`.** `code` is a machine-readable
string (e.g. `"AUTH_RATE_LIMITED"`, `"VALIDATION_FAILED"`, `"CYCLE_DETECTED"`)
— a controlled enum defined in `packages/core`. `message` is human-readable.
`details` is optional (e.g. validation errors array, retry-after seconds).
RFC 7807 wrapping is a post-v1 additive option (mechanical transform, the
`code`/`message`/`details` fields are preserved as extensions).

**Rationale**: RFC 7807 is "correct" for a public API with external clients,
but v1's only client is the frontend (co-deployed). `code` is what the
frontend actually needs (switch on `"AUTH_RATE_LIMITED"` to show a specific
message). The `code` strings are a controlled enum in `core` — machine-
readable, type-safe, no URI namespace to maintain.

---

### ADR-072 — Frontend error handling

**Context**: ADR-071 defined the error format. How does the frontend consume
it?

**Decision**: **Global TanStack Query `QueryClient` `onError` for default
error UX (toast/redirect/retry) + per-mutation `onError` override for form
inline field errors.** The global handler distinguishes error types (401 →
redirect to login, 403 → "insufficient role" toast, 429 → "rate limited" toast
with retry, 422 → let the mutation's local handler do inline field errors, 500
→ generic "something went wrong" toast). A shared `parseFieldErrors(error):
Record<string, string>` utility handles the `details` → field-error mapping
for forms.

**Rationale**: The TanStack Query idiomatic pattern. The global handler is the
single place for default error UX; the `useMutation` calls that need inline
field errors (forms) override `onError`. No full TanStack Query wrapper
(over-engineering for v1). The `parseFieldErrors` utility avoids duplicating
field-error logic across form components. Integrates with shadcn's `Form` via
`react-hook-form`'s `setError`.

---

### ADR-073 — OIDC configuration

**Context**: ADR-027 defines optional OIDC with JIT + claim-based role
mapping. How is it configured?

**Decision**: **Env vars for connection config (`OIDC_ISSUER`,
`OIDC_CLIENT_ID`) + `clientSecretRef` resolved via `SecretResolver` (not raw
env var) + role mapping in single-row `oidc_config` table (UI-editable).**
`oidc_config(enabled, issuer, clientId, clientSecretRef, roleClaimPath,
claimValueField, roleMapping jsonb)`. The `default` key in `roleMapping`
handles JIT provisioning (ADR-027: "default role Viewer" — if no claim
matches, use `default`).

**Rationale**: Fully ADR-023 compliant (secret is a reference, resolved via
the same `SecretResolver` as importer credentials — one secret-handling
pattern). Role mapping is UI-editable (the part that changes as the deployer's
IdP groups evolve); env-var-only would require a restart for every mapping
change. The `oidc_config` table is structured (not key-value) because
`roleMapping` is JSONB and the shape is fixed.

---

### ADR-074 — OIDC claim-to-role mapping

**Context**: Real IdP claims are messy (nested, multi-value, array-of-objects).

**Decision**: **Dot-path `roleClaimPath` + optional `claimValueField` for
array-of-objects; first-match-wins in mapping-definition order; `default` for
no-match.** `roleClaimPath` is a dot-path (e.g.
`"resource_access.componode.roles"`). The mapping logic: (1) traverse the
claims by the dot-path, (2) if array, flatten; if string, treat as single-
element array, (3) if `claimValueField` is set and values are objects,
extract that field, (4) for each value, look up in `roleMapping` — first match
wins, in mapping-definition order, (5) if no match, use `default`.

**Rationale**: Handles 80% of IdPs (Okta `groups`, Keycloak `groups` via a
mapper, Google `groups`) with dot-path alone. The `claimValueField` handles
the remaining 20% (Entra ID app roles as `[{value: "..."}]`, some Keycloak
setups) without a full JSONPath DSL. First-match-wins-in-order handles "user
is in both `admins` and `editors`" (they get `ADMIN` if `admins` is listed
first).

---

### ADR-075 — Self-registration

**Context**: ADR-027 defines local auth. Can users self-register?

**Decision**: **`allowSelfRegistration` flag (default `false`, secure-by-
default).** When enabled, `/register` is public and new users are Viewer
(per ADR-027); Admin promotes via UI. When disabled (default), only Admins
create accounts. Stored in `app_settings` (ADR-076).

**Rationale**: Matches the deployment-model flexibility. An internal-only
deployment (behind a VPN) reasonably wants open registration; a public-facing
deployment wants closed. Default `false` (secure-by-default, matches ADR-053's
default-deny). Invite-based registration is a v1.1 enhancement (token
management is a mini-feature).

---

### ADR-076 — App settings storage

**Context**: ADR-075 introduced `allowSelfRegistration`. Other app-wide
settings are coming (session timeouts, etc.).

**Decision**: **Env vars for infra/secret-adjacent settings + DB `app_settings`
(key-value, JSONB values) for operational/UI-toggled settings.**
`SettingsService.get(key)` unifies both (checks env var first, falls back to
DB, with typed defaults). Env vars: `IMPORTER_MAX_CONCURRENCY` (ADR-061),
`OIDC_ISSUER`/`OIDC_CLIENT_ID` (ADR-073), `BOOTSTRAP_ADMIN_*` (ADR-066). DB
`app_settings`: `allow_self_registration` (ADR-075),
`session_idle_timeout`/`session_absolute_timeout`, `default_user_role`. The
`oidc_config` table (ADR-073) stays separate (structured config, not key-
value).

**Rationale**: Infra settings (restart-required anyway) are env vars;
operational settings (changeable at runtime by an Admin) are DB + UI. The
split is principled by category. Key-value DB table avoids the migration-per-
setting tax. `SettingsService` abstracts both sources into a unified API.

---

### ADR-077 — v1 entity schema (consolidated)

**Context**: Across ADRs + Q1–Q51 we accumulated entity definitions in pieces.
The full schema needs consolidation.

**Decision**: **Full v1 schema (27 tables) approved as proposed in Q45 +
ComponentGroup addition.** See `docs/data-model.md` (to be generated in spec
003) for the complete column-level reference. Key entities:
`digital_products`, `components`, `component_instances`, `component_groups`,
`line_of_businesses`, `teams`, `persons` (unified Person/UserAccount per
ADR-033). Junction tables: `product_composes`, `product_consumes_from`,
`product_depends_on_component`, `component_depends_on_component`,
`component_sources_from`, `component_exposes`. FK columns for 1-to-many:
`digital_products.lobOwnerId`/`teamOwnerId`, `components.teamOwnerId`/
`componentGroupId`, `persons.teamId`. Operational: `importer_configs`,
`import_runs`, `import_run_errors`, `sessions`, `oidc_config`, `app_settings`,
`password_reset_tokens`. Audit: `edge_changes`, `entity_changes`. Kysely:
`kysely_migration`, `kysely_migration_lock`. **Slug on `persons`/`teams`/`LOBs`**
(URL consistency). **Nullable `createdBy`/`updatedBy`** (importer-driven changes
have no human actor). **Nullable `triggeredBy`** for scheduled runs.

> **UPDATE (Session 2, ADR-099/100)**: Three additions from the secure
> development grilling:
> 1. **`password_reset_tokens`** table (table 28) — `id uuid PK`, `userId`
>    FK→`persons`, `tokenHash text not null` (SHA-256 of the 32-byte reset
>    token), `expiresAt timestamptz not null`, `usedAt timestamptz` (nullable,
>    set when the token is consumed), `createdAt timestamptz not null`.
> 2. **`entity_changes`/`edge_changes`** carry denormalized
>    `createdByName`/`updatedByName` (text, captured at write time) for
>    historical context when the `persons` FK is nulled (ADR-100's GDPR
>    `ON DELETE SET NULL`). The `createdBy`/`updatedBy` FKs are
>    `ON DELETE SET NULL`.
> 3. **`sessions.id`** is `text` (not `uuid`) — holds a 32-byte
>    cryptographically random base64url token (ADR-099's exception to
>    ADR-045). All other entity PKs remain `uuid` (UUID v7).
>
> **Append-only triggers** (ADR-100): `BEFORE UPDATE OR DELETE` triggers on
> `entity_changes`, `edge_changes`, `import_run_errors` raise an exception
> unconditionally. `BEFORE UPDATE` trigger on `import_runs` raises if
> `OLD.status` is terminal (`COMPLETED`/`FAILED`/`CANCELLED`/`INTERRUPTED`).

**Rationale**: Consolidates 50+ decisions into one referenceable schema. The
`ComponentGroup` (table 26) + `components.componentGroupId` FK (27) were added
in the Session 2 review of Principle IV — a first-class entity for human-
declared equivalence across distinct source assets, NOT a graph node (no
`DEPENDS_ON` to a group; products depend on member components individually).

---

### ADR-078 — Database migrations

**Context**: ADR-009 chose Kysely's built-in migrations. Where do migration
files live and how are enum values handled?

**Decision**: **All migrations in `packages/backend/src/db/migrations/` (TS,
Kysely schema-builder). Enum values as CHECK constraints generated from
`packages/core` constants (not native Postgres ENUMs).** `core` exports
`COMPONENT_CATEGORIES`, `COMPONENT_PROVIDERS`, etc. as `const` arrays; the
migration imports them and generates the CHECK constraint inline. A
`backend`-local helper wraps the CHECK-generation pattern (not in `core` —
keeps `core` pure per ADR-065).

**Rationale**: One migration directory, one runner, one history. CHECK
constraints (not native ENUMs) because Postgres ENUMs are immutable-ish
(removing a value requires dropping/recreating the type, which cascades to
every column). The taxonomy will evolve (ADR-013's 24 categories will grow);
CHECK constraints are migration-friendly (alter the constraint's value list).
Constants imported from `core` = one source of truth, no drift between TS
enum and DB constraint.

---

### ADR-079 — Enum constant structure

**Context**: ADR-078 has enum values as `core` constants. What is their
structure?

**Decision**: **`const` arrays + union types for enum values + separate
`*_META` maps for labels/descriptions.** `core` exports
`COMPONENT_CATEGORIES = ["COMPUTE", ...] as const` + `type ComponentCategory
= typeof COMPONENT_CATEGORIES[number]` + `COMPONENT_CATEGORY_META: Record<
ComponentCategory, {label, description}>`. Backend imports values only;
frontend imports both (values + metadata for UI labels).

**Rationale**: Clean separation of the enum (for validation/DB) from display
metadata (for UI). "Add a category" (update array + migration) is distinct
from "rename a category's display label" (update metadata map, no migration).
TS `enum` declarations are avoided (tree-shaking issues, ecosystem moving
away). The metadata map is where future i18n hooks in.

---

### ADR-080 — Pagination strategy

**Context**: List endpoints need pagination. A deployer with 50,000 components
needs it.

**Decision**: **Cursor-based for high-cardinality (components, instances, runs,
audit logs) + offset-based for low-cardinality (products, LOBs, teams,
persons, importer configs).** Cursor is `(createdAt, id)` (UUID v7 is time-
sortable per ADR-045). Frontend `usePaginatedQuery` hook abstracts both.

**Rationale**: Cardinality asymmetry is real (5-20 products vs 50,000
components). Forcing cursor on products loses "page 1 of 2" UX; forcing offset
on components makes `OFFSET 40000` a 2-second query. Right tool per endpoint.
Estimated counts (`pg_class.reltuples`) for display if needed ("~50,000
components").

---

### ADR-081 — Filtering and sorting

**Context**: List endpoints need filtering and sorting.

**Decision**: **Fixed query params per endpoint, AND-only, single-value
filters in v1. `sort=field:direction` with allow-listed sortable fields.**
Each endpoint declares its supported filters (e.g.
`GET /api/v1/components?category=COMPUTE&provider=AWS&lifecycle=ACTIVE`).
Ranges and OR-combinations are v1.1 needs.

**Rationale**: v1 UI's filter needs are single-value, AND-combined (category
select, provider select, lifecycle select, owner select). A generic filter
DSL is overkill and creates a security surface (arbitrary column filtering).
Ranges/OR can be added later as multi-value params or a structured filter
extension without breaking existing params. Sort allow-list prevents sorting
on unindexed columns.

---

### ADR-082 — ComponentGroup (v1 inclusion)

**Context**: Principle IV originally deferred human-declared component
aliasing (Case B — three distinct source assets considered one logical
component) to v1.1. The user noted Case B "happens quite often."

**Decision**: **`ComponentGroup` pulled into v1.** A first-class entity with
its own `slug`, `name`, `description`, `lifecycle` (`ACTIVE`/`RETIRED`),
`teamOwnerId`/`lobOwnerId` (ownership via the same `OWNS` FK pattern).
`components.componentGroupId` is a nullable FK. The group is NOT a graph node
— no `DEPENDS_ON` to a group; products depend on member components
individually. Sub-feature of spec 003 (component-catalog).

**Rationale**: If Case B is frequent, the cost of *not* having it (user
confusion on the main dashboard, every day) exceeds the cost of one entity +
one FK + one UI section. A first-class concept in the user's mental model
deserves a first-class entity, not an edge or a column. The group's lifecycle
is separate (a group is `ACTIVE` as long as it has ≥1 `ACTIVE` component, or
the human sets it explicitly). Ownership at the group level is distinct from
ownership of individual components.

---

### ADR-083 — v1 feature breakdown

**Context**: The ADRs define architecture. Spec-kit needs feature descriptions.
Is v1 one spec or many?

**Decision**: **6 spec-kit features with foundation-first.**
1. `001-foundation` — `core` contracts + DB schema + migrations + backend
   skeleton (Fastify, Kysely, auth, sessions, RBAC, bootstrap admin, local
   auth, OIDC). Milestone: "deploy, log in, see empty dashboard."
2. `002-importer-framework` — run service, scheduler, registry,
   reconciliation, cancellation, observability for runs. Milestone:
   "configure an importer and run it."
3. `003-component-catalog` — component/instance services + UI (listing,
   filtering, `ComponentGroup` grouping), the 7 v1 importers. Milestone:
   "dashboard shows real components."
4. `004-product-hierarchy` — products, edges, ownership, Platform Product
   workflow, hierarchy UI. Milestone: "model my products." (Overlaps with 003
   after 001+002.)
5. `005-audit-and-settings` — audit tables, settings, admin UI.
6. `006-deployment-and-docs` — Docker Compose, docs, CI, changesets.

Dependencies: 001 first → 002 → 003 + 004 (overlap) → 005 + 006.

**Rationale**: One giant spec is unmanageable (spec-kit's workflow isn't
designed for specs that large). Horizontal layers deliver no user value
incrementally. Foundation-first acknowledges the irreducible core (contracts +
schema + auth + backend skeleton), then vertical slices on top. Each spec is
a demoable milestone.

---

## Session 2 — Secure Development Grilling (ADR-084 through ADR-102)

> The following 19 decisions ratify the secure development rules grilled
> after the architecture grilling session. They cover coding-time security
> practices that the architecture-level ADRs (001–083) don't address: SQL
> injection, XSS, CSRF, CORS, security headers, secret handling in logs and
> commits, dependency scanning, TLS, input validation, error response
> sanitization, rate limiting, importer sandboxing, password/credential
> handling, audit log integrity, database connection security, and content
> injection in JSONB fields. These rules are binding for all runtime code.

### ADR-084 — SQL injection prevention

**Context**: Kysely parameterizes by default, but exposes `sql.raw()` and
`sql.fragment()` for advanced cases. A contributor hitting a query-builder
limitation (e.g. ADR-051's recursive CTE) might reach for `sql.raw()` and
introduce a SQL injection vector.

**Decision**: **All database queries MUST use Kysely's parameterized query
builder.** `sql.raw()` and `sql.fragment()` are PROHIBITED in application
code (services, routes, repositories). In migrations, `sql.raw()` is
permitted for DDL the builder cannot express (e.g. trigger creation for
ADR-050's cycle detection), with a `// SECURITY: raw SQL in migration, no
user input` comment. Any `sql.raw()` in application code requires a
documented security justification in the PR and a `// SECURITY:` comment. A
CI grep check flags `sql.raw()` usage without the comment.

**Rationale**: Kysely's builder is the default safe path. The exception for
migrations acknowledges that triggers and CHECK constraints (ADR-078) need
raw DDL. The CI grep check makes the `// SECURITY:` comment requirement
enforceable, not just "reviewed by a human."

---

### ADR-085 — XSS prevention

**Context**: React escapes by default, but `dangerouslySetInnerHTML`,
`href="javascript:..."`, and `target="_blank"` without `rel="noopener
noreferrer"` are XSS/tabnabbing vectors.

**Decision**: **The frontend MUST NOT use `dangerouslySetInnerHTML` in v1.**
All user-controlled content is rendered through React's default escaping. If
rich-text rendering is required in a future spec, it MUST use a sanitizing
library (e.g. `dompurify`) with an allow-listed tag/attribute set. URL
fields MUST be validated against an allow-list of protocols (`http`,
`https`, `mailto`) before rendering as `href` — a shared `safeUrl(url):
string | null` utility in `packages/frontend` centralizes this. All
`target="_blank"` links MUST include `rel="noopener noreferrer"` — a shared
`<ExternalLink>` component enforces this.

**Rationale**: No v1 feature needs HTML rendering (all content is structured
data). The three XSS vectors that exist even without `dangerouslySetInnerHTML`
(HTML injection, protocol injection, reverse tabnabbing) are each covered by
a concrete, enforceable artifact (`safeUrl`, `<ExternalLink>`).

---

### ADR-086 — Session cookie security flags

**Context**: ADR-043 mandates server-side sessions. The session ID is the
cookie value. Without `HttpOnly`/`Secure`/`SameSite`, the cookie is
vulnerable to XSS theft, HTTP sniffing, and CSRF.

**Decision**: **`HttpOnly: true`, `Secure: true` in production, `SameSite:
Lax`.** Cookie name configurable (`SESSION_COOKIE_NAME`, default
`componode_session`). In dev, `Secure` is automatically `false` when
`NODE_ENV !== 'production'` (implicit, cannot be forgotten). A deployer
running production without TLS can explicitly set `SESSION_COOKIE_SECURE=
false`. `SameSite: Strict` is an optional deployer setting
(`SESSION_COOKIE_SAMESITE=strict`). No `__Host-` / `__Secure-` prefix in v1
(dev-HTTP conflict).

**Rationale**: `Lax` blocks CSRF-relevant verbs (POST/PUT/DELETE) while
allowing top-level GET navigations (standard for single-org tools).
`Strict` is available for high-security environments. The implicit dev
override (`NODE_ENV`) avoids the "forgot to set the env var" failure mode.
No `__Host-` prefix because it requires TLS in all environments.

---

### ADR-087 — CSRF protection

**Context**: ADR-086's `SameSite: Lax` blocks cross-site POST/PUT/DELETE on
modern browsers, but legacy browsers and subdomain attacks are gaps.

**Decision**: **Double-submit cookie pattern on all state-changing routes
(`POST`/`PUT`/`PATCH`/`DELETE`).** The backend sets a CSRF token cookie
(`componode_csrf`, `HttpOnly: false`, `SameSite: Lax`, `Secure` matches
session cookie), and the frontend sends the token as an `X-CSRF-Token`
header on every state-changing request. The backend's `preHandler` compares
cookie to header — mismatch = `403`. Universal (not conditional on
deployment type). GET routes MUST NOT have side effects (ADR-094).

**Rationale**: Double-submit is stateless and simple (no server-side token
store). Layered with `SameSite: Lax` (ADR-086). Universal because the
complexity is the same either way, and a public-facing deployment
(ADR-075) is a real CSRF target.

---

### ADR-088 — CORS configuration

**Context**: In production, the frontend is same-origin (backend serves
static via `fastify-static`), so CORS is not needed. In dev, the Vite dev
server runs on a different port. A misconfigured `Access-Control-Allow-
Origin: *` with `Allow-Credentials: true` is a security hole.

**Decision**: **CORS is opt-in (default empty = disabled).** Explicit
allow-list of exact origins (`CORS_ALLOWED_ORIGINS` env var, comma-
separated, no wildcards, no patterns). In dev, the Vite proxy
(`server.proxy['/api'] = 'http://localhost:3000'`) is the primary mechanism
— CORS is not needed. When `CORS_ALLOWED_ORIGINS` is non-empty:
`Access-Control-Allow-Credentials: true` for allow-listed origins,
`Access-Control-Max-Age: 3600`, allowed methods are the route's actual
methods (not `*`). When empty: the CORS preHandler is a no-op.

**Rationale**: Opt-in minimizes the CORS attack surface to "only what the
deployer explicitly configures." The Vite proxy eliminates the dev CORS
need. Exact origins only (no patterns) prevents subdomain-takeover
exploitation.

---

### ADR-089 — Security headers

**Context**: Without security headers, the application is vulnerable to
MIME sniffing, clickjacking, downgrade attacks, and resource injection.

**Decision**: **`@fastify/helmet` (or equivalent) on all HTTP responses.**
Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Strict-Transport-Security: max-age=31536000` (production only, no
`includeSubDomains`), `Content-Security-Policy: default-src 'self';
script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
connect-src 'self'; frame-ancestors 'none'`, `Referrer-Policy: strict-
origin-when-cross-origin`, `Permissions-Policy: geolocation=(),
microphone=(), camera=()`. HSTS is production-only. CSP `style-src
'unsafe-inline'` is a documented tradeoff for Tailwind CSS + shadcn/ui.
Both `X-Frame-Options` and `frame-ancestors` are set (defense in depth).
Headers apply to all routes including `/metrics`.

**Rationale**: `includeSubDomains` dropped from HSTS (deployer safety —
avoids breaking non-HTTPS subdomains). Nonce-based CSP is a v1.1
enhancement (Tailwind's inline styles require `'unsafe-inline'` for now).
Both frame-ancestors and X-Frame-Options for legacy browser support.

---

### ADR-090 — No secrets in logs

**Context**: Pino is structured logging (JSON) — every field in the
metadata object is persisted. A `log.info({ secrets }, "importer starting")`
would write all resolved secrets to the log file in plaintext.

**Decision**: **Pino redaction filter strips prohibited field paths.**
Redacted paths: `password`, `passwordHash`, `clientSecret`, `secretRefs`,
`secrets`, `secrets.*`, `sessionToken`, `sessionId`, `authorization`,
`cookie`, `oidcSubject`, `email`, `importer_configs.secretRefs`,
`importer_configs.scope`. Replaced with `"[REDACTED]"`. Importers receive an
abstracted `Logger` (ADR-067) pre-configured with the same redaction. When
logging an importer's configuration, log only safe metadata (`importerName`,
`configId`, `label`, `schedule`), never the full `importer_configs` row.
When logging a request, log headers selectively. Stack traces are logged
as-is (documented tradeoff — sanitizing is over-engineering for v1).

**Rationale**: Structured logging makes accidental secret leakage easy and
persistent. The redaction filter catches known field names. The
`importer_configs.scope` redaction catches the case where scope contains
account IDs or tokens. Stack trace sanitization is deferred (the risk of
embedded credentials in URLs is mitigated by `secrets.*` redaction).

---

### ADR-091 — No secrets in commits

**Context**: A committed secret is permanently in git history. For an
open-source project on GitHub, a committed AWS key is scraped by bots and
used for cryptomining within minutes.

**Decision**: **Secrets MUST NOT be committed.** `.gitignore` includes
`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `secrets/`. CI MUST run a
secret scanner on every PR (enforceable boundary). Pre-commit hook (via
`husky`) is a SHOULD (bypassable with `--no-verify`). The example
`docker-compose.yml` uses `${BOOTSTRAP_ADMIN_PASSWORD:?must set}` and
`env_file: .env`. `.env.example` files use placeholder values. Test
fixtures use clearly fake values and are allow-listed in the scanner config.
If a secret is committed: revert (force-push to rewrite history if
sensitive — exception to the "no force-push" rule), rotate, document in a
post-mortem.

**Rationale**: CI is the enforceable boundary (PRs can't bypass it). The
force-push exception for secret removal overrides the general "no
force-push" rule — the cost of a leaked secret in history exceeds the cost
of rewriting history. Test fixtures are allow-listed to avoid false
positives on `test:test` credentials.

---

### ADR-092 — Dependency scanning

**Context**: The dependency tree is the largest external attack surface
(npm supply chain). A vulnerable dependency is exploitable even if
Componode's own code is secure.

**Decision**: **CI MUST run a dependency vulnerability scanner on every
PR.** `high`/`critical` severity blocks the PR (CI fails), unless the
vulnerability is in a dev-only dependency that does not ship to production
AND the PR includes a `// SECURITY:` comment. `moderate`/`low` are warnings.
Dependencies MUST be pinned to exact versions (no `^` or `~`). Version
bumps via `changesets` or dedicated PR. Newly published versions (less than
7 days old) MUST NOT be used.

**Rationale**: Exact pinning prevents floating ranges from auto-resolving
to new (potentially malicious) versions. The 7-day rule extends the
existing AGENTS.md rule to version bumps of existing deps. The dev-only
override prevents blocking PRs for non-exploitable vulnerabilities in test
utilities.

---

### ADR-093 — TLS / HTTPS for production

**Context**: Without TLS, the session cookie, OIDC authorization code flow,
and API responses are transmitted in plaintext.

**Decision**: **Production MUST use HTTPS. Componode does not terminate TLS
— TLS is terminated by the deployer's reverse proxy (nginx, Caddy, Traefik,
or cloud LB).** The backend sets `Strict-Transport-Security` in production
(ADR-089) and configures `trustProxy` to the proxy's IP (via
`TRUSTED_PROXY_IP` env var, not `true`) to trust `X-Forwarded-Proto`/
`X-Forwarded-Host` without allowing client spoofing. `docs/deployment.md`
documents TLS setup for Caddy (automatic Let's Encrypt) and nginx
(manual/explicit). The example `docker-compose.yml` includes a commented-
out Caddy service. Dev runs over HTTP (no TLS required).

**Rationale**: In-app TLS termination pushes cert management into the app
(the proxy's job). `trustProxy` to proxy IP (not `true`) prevents client
spoofing of `X-Forwarded-Proto`. Two proxy options documented (neutral, not
opinionated). Dev is HTTP (localhost is not a sniffing risk).

---

### ADR-094 — GET routes must not have side effects

**Context**: Rule 4's CSRF protection covers POST/PUT/PATCH/DELETE but not
GET. A GET route with side effects is a CSRF vector (`<img src="...">`
triggers it with the user's cookies).

**Decision**: **GET/HEAD routes MUST be idempotent and side-effect-free
with respect to domain state.** They MUST NOT mutate domain entities,
trigger importer runs, modify sessions (other than `lastSeenAt` operational
bookkeeping per ADR-043), or perform any action that changes persistent
domain state. State-changing operations MUST use POST/PUT/PATCH/DELETE with
CSRF protection (ADR-087). Operational bookkeeping (`sessions.lastSeenAt`
write-throttled, `import_runs.lastPolledAt` if added) is permitted.
Read-access auditing is NOT performed on GET routes in v1 (ADR-052 logs
consequential state changes and human edits, not read access). If read-
access auditing is added in a future spec, it MUST be asynchronous and
decoupled from the GET route's response path.

**Rationale**: The prohibition is on domain state changes, not operational
bookkeeping (which is not CSRF-exploitable). Read-access auditing on GET
routes would be a side effect + a potential CSRF vector; deferred to a
future spec with proper design.

---

### ADR-095 — Input validation

**Context**: Without route-boundary validation, a malformed request
propagates into the service layer and the database, causing storage bloat,
CHECK constraint violations, or injection vectors.

**Decision**: **All API request inputs MUST be validated at the route
boundary using Zod schemas.** Failed validation → `400` with
`{code: "VALIDATION_FAILED", message, details: [{field, issue}]}` (ADR-071).
Unknown fields rejected (Zod `.strict()`). Default max-lengths: 255 for
names/labels, 100 for slugs, 2000 for descriptions, 100 for `resourceType`
(specs may override with justification). Enum inputs validated against
`core` constants (ADR-079). Shared schemas in `packages/core`, backend-only
schemas in `packages/backend/src/routes/schemas/`. Fastify `bodyLimit: 1MB`
default (configurable via `MAX_REQUEST_BODY_SIZE`).

**Rationale**: Validating at the route boundary means the service layer
receives typed, validated data. Sharing schemas in `core` enables frontend
client-side validation (no drift). `.strict()` catches typos and prevents
silent data loss. The body size limit prevents DoS via large request bodies.

---

### ADR-096 — Error responses must not leak internals

**Context**: A raw error response (`500: TypeError at /app/packages/
backend/src/services/...:42`) leaks the tech stack, file structure, and
code flow to an attacker.

**Decision**: **Error responses use `{code, message, details?}` (ADR-071)
with controlled `code` enums.** `message`/`details` MUST NOT include stack
traces, file paths, SQL text, raw DB errors, env var names, or internal
service names. Stack traces logged server-side only (ADR-090). DB errors
translated: `23505` → `409 DUPLICATE_SLUG`/`DUPLICATE_KEY`, `23514` → `400
VALIDATION_FAILED`, `23503` → `409 REFERENTIAL_INTEGRITY`, `40P01` → `409
CONFLICT_RETRY`, cycle-detection exception → `409 CYCLE_DETECTED` (with
`details: {cycle: [productId, ...]}` — the cycle path is intentional, not
a leak). In dev, a `debug` field is gated by `DEBUG_ERROR_DETAILS=true` env
var (not `NODE_ENV`). The `debug` field is never populated for auth error
codes (`AUTH_INVALID_CREDENTIALS`, `AUTH_RATE_LIMITED`,
`AUTH_SESSION_EXPIRED`, `AUTH_FORBIDDEN`, `OIDC_CALLBACK_FAILED`).

**Rationale**: The SQLSTATE mapping makes DB error translation consistent
and enforceable. The `debug` field gated by explicit env var (not
`NODE_ENV`) avoids misconfiguration leaks. Auth codes never get `debug` to
prevent user enumeration or credential detail leakage. The cycle path in
`details` is intentional (the user needs it to fix the cycle).

---

### ADR-097 — Rate limiting

**Context**: Without rate limiting, a single user or compromised session
can DoS the backend or Postgres. Importer triggers are a specific DoS
vector.

**Decision**: **Rate-limiting Fastify plugin with in-memory store for v1.**
Login: 5 per username/IP per min. OIDC callback: 5 per IP per min.
Registration: 3 per IP per min. Importer trigger: 10 per user per min.
General API: 300 per user per min. `/metrics`: unlimited. Responses include
`Retry-After` header. General API limit is per-user (session ID), not per-
IP (corporate NAT safety). Multi-instance requires Redis (post-v1, known
v1 limitation). All `/api/v1/*` routes are authenticated (Viewer minimum
per ADR-054).

**Rationale**: 300/min general limit accommodates dashboard polling (5
concurrent run polls at 2s intervals = ~150/min) plus normal UI
interactions. Per-user keying (not per-IP) prevents a corporate NAT with
100 users from sharing a single limit. Importer trigger keyed per-user
(ADR-039's per-config in-flight guard handles per-config spam).

---

### ADR-098 — Importer sandboxing

**Context**: ADR-065 mandates importers depend only on `core`. But
dependency boundaries don't prevent a compromised importer from reading
`process.env.DATABASE_URL`, spawning a child process, or reading
`~/.ssh/id_rsa`.

**Decision**: **ESLint `no-restricted-imports` and `no-restricted-syntax`
in importer packages.** PROHIBITED: `fs`, `fs/promises`, `fs-extra`,
`process.env`, `child_process`, `execa`, `shelljs`, `eval`, `new Function`,
`vm`, `import()`. PERMITTED: `fetch`/HTTP clients, `Logger`/`Tracer` from
`core`, `validateDiscoveredAsset` from `core`, the importer's own package
files. SDKs that default to `process.env` MUST be configured with explicit
values from `secrets`/`config`. True process-level sandboxing (worker
threads, separate containers) is post-v1. The ESLint rules are static
enforcement — they prevent accidental leakage and catch malicious PRs at
the CI boundary, but do not protect against a determined attacker who
bypasses ESLint and passes review.

**Rationale**: Static ESLint enforcement is the pragmatic v1 choice (the 7
importers are core-team-written, contributor importers are reviewed PRs).
The "no requests to own API" constraint was dropped (unforceable via static
analysis — ESLint cannot determine the runtime URL of a `fetch()` call).

---

### ADR-099 — Secure password and credential handling

**Context**: ADR-044 mandates Argon2id but doesn't cover password
complexity, reset flows, secret lifecycle, or timing attacks.

**Decision**: **Comprehensive password/credential handling.** (1) Argon2id
via `@node-rs/argon2`, PHC format, configurable params (OWASP defaults: 19
MiB, 2 iterations, 1 lane). (2) Minimum 12 characters, no maximum, no
complexity rules (NIST SP 800-63B). (3) Password reset: Admin-triggered,
32-byte base64url token, SHA-256 hashed in `password_reset_tokens` table,
15-min expiry, single-use, Admin never knows the new password, email
delivery post-v1. (4) OIDC client secret: `clientSecretRef`, in-memory only
for token exchange. (5) Importer secrets: in-memory only for run duration,
dereferenced after. (6) Bootstrap admin password: read once on empty-DB
boot, hashed immediately. (7) Timing attacks: login hashes a dummy password
for non-existent users. (8) **Session IDs are 32-byte cryptographically
random (base64url), NOT UUID v7 — exception to ADR-045.** Session tokens are
credentials, not entity identifiers, and require cryptographic randomness.

**Rationale**: The session ID exception to ADR-045 is critical: UUID v7's
74 bits of randomness is brute-force infeasible but not the standard for
session tokens (256-bit crypto-random is). The token-based reset flow is
more secure than "Admin sets temp password" (the Admin never knows the new
password). The timing-attack mitigation (dummy hash) prevents user
enumeration via response time differences.

---

### ADR-100 — Audit log integrity

**Context**: ADR-052 defines audit tables but no rule says they're
tamper-proof. A compromised Admin could edit `entity_changes` to cover
tracks.

**Decision**: **`entity_changes`, `edge_changes`, `import_run_errors` are
append-only.** `BEFORE UPDATE OR DELETE` trigger on all three raises an
exception unconditionally. No role — including Admin — can modify or delete
audit entries. Corrections are new entries (`action: CORRECTION`,
referencing the original entry's ID). `import_runs` is NOT append-only but
is immutable after terminal state (`COMPLETED`/`FAILED`/`CANCELLED`/
`INTERRUPTED`) via a `BEFORE UPDATE` trigger checking `OLD.status`.
Operator notes on a run are `entity_changes` entries, not mutations on
`import_runs`. **GDPR interaction**: `entity_changes.createdBy`/`updatedBy`
are nullable FKs to `persons` with `ON DELETE SET NULL`. Denormalized
`createdByName`/`updatedByName` snapshots (captured at write time) retain
the name for historical context (deliberate tradeoff: audit integrity vs.
right-to-be-forgotten). No retention policy in v1.

**Rationale**: DB-level triggers are un-bypassable (application bugs can't
skip them). The `import_runs` terminal-state immutability prevents
post-hoc manipulation of run records. The GDPR `ON DELETE SET NULL` +
denormalized name snapshot preserves the audit trail's usefulness while
respecting hard-delete of persons. The name snapshot tradeoff is documented
(audit integrity wins over complete right-to-be-forgotten for historical
records).

---

### ADR-101 — Database connection security

**Context**: The database connection is the crown-jewel trust boundary.
Without TLS, the connection string and all query data are sniffable. Without
pool limits, a burst of requests can exhaust Postgres connections. Without
least-privilege, a SQL injection can `DROP DATABASE`.

**Decision**: **(1) TLS: `DATABASE_SSL_MODE` env var (default `require` in
production, `disable` in dev; `verify-full` for remote Postgres with
`DATABASE_SSL_CA`). (2) Pool limits: `MAX_DB_CONNECTIONS` env var (default
10), with documented pool budget calculation. (3) Credential rotation:
update env var + restart. (4) Least-privilege DB user: `init-db.sql` script
in the example `docker-compose.yml` creates a `componode` user with
`CONNECT` + DML/DDL on `public` schema (not the Postgres superuser). (5)
Migration privileges: single user for DDL+DML in v1; split
(`MIGRATION_DATABASE_URL` for DDL, `DATABASE_URL` for DML-only) is v1.1.
(6) Driver: chosen by spec 001-foundation; MUST support TLS, prepared
statements, configurable pool limits.

**Rationale**: `require` (not `verify-full`) as default because the Docker
Compose deployment has Postgres on the same Docker network (low MITM risk).
`verify-full` documented for remote Postgres. The `init-db.sql` is an
enforceable artifact (not just documentation). The migration-privilege
split is deferred to v1.1 (adds complexity for a hardened-deployment
minority).

---

### ADR-102 — Content injection in JSONB fields

**Context**: Importers yield arbitrary data in `Component.details` and
`ComponentInstance.rawConfig`. A malicious external source could yield
`details: {"xss": "<img src=x onerror=alert(1)>"}` or `rawConfig: {"url":
"javascript:alert(1)"}`.

**Decision**: **(1) Frontend rendering: JSONB fields MUST be rendered as
structured data (text in React components, or JSON tree rendering values as
text). MUST NOT pass through `dangerouslySetInnerHTML` (ADR-085), `eval()`,
or any HTML/string interpretation. (2) URLs in JSONB: sanitized via
`safeUrl()` (ADR-085) before rendering as `href`. JSON tree components MUST
NOT auto-link URLs (or MUST sanitize if they do). (3) Markdown/rich-text
rendering of JSONB is PROHIBITED in v1. If a future spec requires it, MUST
use `react-markdown` + `rehype-sanitize` with allow-listed tags, and the
raw markdown MUST be stored in a dedicated field (not free-form `details`).
(4) Backend error responses: JSONB values in `details` are safe (React
escapes), but MUST NOT be in error `message` strings. (5) Backend SQL:
JSONB fields queried via Kysely's JSONB operators, never string
interpolation (ADR-084).**

**Rationale**: The `details`/`rawConfig` fields are the largest untrusted-
data surface in the frontend. Rendering as structured data (text) is safe
by default (React escapes). The markdown prohibition is explicit (a
contributor might reach for a markdown renderer to show "rich" config —
this rule blocks it in v1). The dedicated-field requirement for future
markdown clearly marks rich-text content as requiring sanitization.
