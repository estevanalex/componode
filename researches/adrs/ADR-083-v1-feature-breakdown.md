### ADR-083 — v1 feature breakdown

> **Status:** Ratified

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

## Session 2 — Secure Development Grilling ([ADR-084](./ADR-084-sql-injection-prevention.md) through [ADR-102](./ADR-102-content-injection-in-jsonb-fields.md))

> The following 19 decisions ratify the secure development rules grilled
> after the architecture grilling session. They cover coding-time security
> practices that the architecture-level ADRs (001–083) don't address: SQL
> injection, XSS, CSRF, CORS, security headers, secret handling in logs and
> commits, dependency scanning, TLS, input validation, error response
> sanitization, rate limiting, importer sandboxing, password/credential
> handling, audit log integrity, database connection security, and content
> injection in JSONB fields. These rules are binding for all runtime code.