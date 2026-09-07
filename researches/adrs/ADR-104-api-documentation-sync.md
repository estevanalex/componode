### ADR-104 — API documentation: `docs/openapi.yaml` canonical, mechanically enforced

> **Status:** Ratified

**Context**: The REST API surface was originally documented as a hand-maintained
table in `README.md` ("API Surface"). That table drifted from the
implementation — it listed `GET /metrics` under `/api/v1` (it is served at the
root), marked session endpoints as Admin-only (they accept any authenticated
session), and omitted the entire products, components, component-groups,
importers, organization, dashboard, and search surface. ADR-030 fixes *where*
docs live (README + `docs/`, Markdown) but says nothing about keeping the API
reference in sync with the code. A rule enforced only by reviewer vigilance is
the same mechanism that already failed once — and for an OSS project, docs are
the product (ADR-030).

**Decision**: **`docs/openapi.yaml` is the single canonical, hand-maintained
description of the API. `docs/api.md` is partially generated from it. Drift is
a test failure, not a reviewer's job.**

1. `docs/openapi.yaml` — OpenAPI 3.0 specification covering every route
   registered in `packages/backend/src/routes/`, including request/response
   schemas (mirroring the Zod schemas in `packages/core`), the error envelope
   (`{code, message, details?}`, codes from `ERROR_CODES`), and security
   schemes (session cookie + `X-CSRF-Token`).
2. **Access control is machine-readable**: each operation declares
   `x-permission: "<perm>"` matching the `requireRole("<perm>")` guard, and
   public operations carry `security: []` (absence of `verifySession` in the
   route's `preHandler`). `requireRole` tags its returned handler with the
   permission so the contract test can introspect route options.
3. `docs/api.md` — human-readable companion. Prose (conventions, auth
   explanation) is hand-written; the endpoint tables and the error-code table
   are **generated regions** (`<!-- GENERATED:... -->` markers) emitted by the
   `docs:api` generator script from `openapi.yaml`. Hand edits inside
   generated regions are overwritten.
4. `README.md` keeps only a short pointer to these two files — no endpoint
   tables in the README.
5. **Mechanical enforcement**: a Vitest contract test in `packages/backend`
   registers all route plugins against a recording Fastify instance (`onRoute`
   hook) and asserts, for every registered route:
   - the path + method exists in `openapi.yaml` (auto-registered `HEAD`
     routes ignored; `GET /metrics` outside `/api/v1` included explicitly);
   - the spec's `x-permission` equals the tagged `requireRole` permission;
   - `security: []` in the spec ⇔ no `verifySession` in `preHandler`.
   The same test asserts `ERROR_CODES` (core) = the `Error.code` enum in
   `openapi.yaml`, and regenerates `docs/api.md` in memory, failing if it
   differs from the committed file.
6. **Scope of "endpoint change"**: any change to a route path, method, auth or
   `requireRole` requirement, request body/query schema, response shape, or
   status-code behavior requires a corresponding `openapi.yaml` update in the
   same PR; `docs/api.md` is updated by running the generator. New
   `ERROR_CODES` entries must be added to the `Error.code` enum.
7. **Hand-maintained spec, not generated**: routes do not declare JSON
   schemas, so `fastify-swagger`-style generation of the OpenAPI *input* is
   not available for v1. Full generation remains a possible future upgrade
   (requires attaching schemas to ~60 routes); a future ADR governs that
   migration. The contract test remains useful either way.
8. Spec-kit `contracts/` artifacts produced by `speckit-plan` remain
   per-feature working documents; this ADR governs the canonical published
   reference in `docs/`.

**Rationale**: Documentation that is not bound to the change that affects it
always drifts — the README table already had, on three axes (path prefix,
access level, missing surface). Three hand-maintained copies of the endpoint
list (routes, YAML, MD) would guarantee the same failure; generating `api.md`'s
tables from the YAML and asserting route/permission coverage in a test removes
the dual-maintenance problem at the root instead of policing it. `x-permission`
is the idiomatic OpenAPI extension point and renders harmlessly in Swagger UI.
Hand-maintaining the spec itself is acceptable at ~60 endpoints — the
alternative (attaching JSON schemas to every route for `zod-to-json-schema`
conversion) is a real refactor whose payoff doesn't justify blocking correct
docs today.

**Consequences**: A PR that changes endpoints without updating
`openapi.yaml` fails the backend test suite. `requireRole` gains a
non-behavioral metadata property. `docs/api.md` must be regenerated via
`pnpm docs:api` (or equivalent) rather than edited inside generated regions.
`GET /metrics` remains documented as an exception (no `/api/v1` prefix). If
OpenAPI generation from route schemas is adopted later, this ADR is
superseded, not silently dropped.
