### ADR-104 — API documentation sync: `docs/openapi.yaml` + `docs/api.md` are normative

> **Status:** Ratified

**Context**: The REST API surface was originally documented as a hand-maintained
table in `README.md` ("API Surface"). That table drifted from the
implementation — it listed `GET /metrics` under `/api/v1` (it is served at the
root), marked session endpoints as Admin-only (they accept any authenticated
session), and omitted the entire products, components, component-groups,
importers, organization, dashboard, and search surface. ADR-030 fixes *where*
docs live (README + `docs/`, Markdown) but says nothing about keeping the API
reference in sync with the code. Without a binding rule, every route change is
a documentation regression waiting to happen — and for an OSS project, docs are
the product (ADR-030).

**Decision**: **The canonical API reference lives in `docs/` and MUST be
updated in the same change that adds, modifies, or removes an API endpoint.**

1. `docs/openapi.yaml` — OpenAPI 3.0 specification covering every route
   registered in `packages/backend/src/routes/`, including request/response
   schemas (mirroring the Zod schemas in `packages/core`), RBAC permissions,
   the error envelope (`{code, message, details?}`, codes from `ERROR_CODES`),
   and security schemes (session cookie + `X-CSRF-Token`).
2. `docs/api.md` — human-readable companion: conventions (auth, CSRF,
   identifier rules, retired/gone filtering), the error-code table, and
   per-resource endpoint tables.
3. `README.md` keeps only a short pointer to these two files — no endpoint
   tables in the README.
4. **Scope of "endpoint change"**: any change to a route path, method, auth or
   `requireRole` requirement, request body/query schema, response shape, or
   status-code behavior in `packages/backend/src/routes/` (or the Zod schemas
   they validate against) requires a corresponding update to both documents in
   the same PR. New error codes added to `ERROR_CODES` must be added to the
   error-code table.
5. **Hand-maintained, not generated**: the spec is maintained by hand for v1
   (routes do not declare JSON schemas, so `fastify-swagger`-style generation
   is not available). Generated OpenAPI may replace this if routes gain
   schemas — a future ADR governs that migration.
6. Spec-kit `contracts/` artifacts produced by `speckit-plan` remain
   per-feature working documents; this ADR governs the canonical published
   reference in `docs/`.

**Rationale**: Documentation that is not bound to the change that affects it
always drifts — the README table already had. A single canonical OpenAPI file
gives contributors, self-hosters, and tooling (Swagger UI, codegen, contract
tests) one source of truth, while `docs/api.md` serves readers who want a
scannable reference. Keeping both under the same ADR prevents them from
diverging from each other. Hand-maintenance is acceptable at ~60 endpoints;
generation is a possible future upgrade but requires route-level schemas first.

**Consequences**: Reviewers must check doc diffs on any PR touching routes or
`packages/core` API schemas. The README no longer duplicates endpoint detail.
`GET /metrics` remains documented as an exception (no `/api/v1` prefix). If a
docs-site or OpenAPI generation is adopted later, this ADR is superseded, not
silently dropped.
