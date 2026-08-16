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
| `COMPOSES` | DigitalProduct → DigitalProduct | Parent composes child (hierarchy) | **DAG**: child has many parents; parent has many children ([ADR-049](./ADR-049-composes-hierarchy-dag-with-unlimited-depth.md)) |
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

> The following 51 decisions ([ADR-033](./ADR-033-person-useraccount-unification.md) through [ADR-083](./ADR-083-v1-feature-breakdown.md)) were ratified in the
> second grilling session. They fill gaps left by Session 1 and refine
> ambiguities in the ratified ADRs. [ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md)'s `COMPOSES` cardinality is
> corrected in place (see edit below). These decisions are binding for v1.