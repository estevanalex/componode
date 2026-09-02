### ADR-032 — Observability: full (Pino + Prometheus + OpenTelemetry)

> **Status:** Ratified

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

## Session 2 — 2026-08-16 Grilling (Decisions Q1–Q51)

> The following 51 decisions ([ADR-033](./ADR-033-person-useraccount-unification.md) through [ADR-083](./ADR-083-v1-feature-breakdown.md)) were ratified in the
> second grilling session. They fill gaps left by Session 1 and refine
> ambiguities in the ratified ADRs. [ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md)'s `COMPOSES` cardinality is
> corrected in place (see the ADR index). These decisions are binding for v1.
