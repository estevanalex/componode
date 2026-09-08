### ADR-083 — v1 feature breakdown

> **Status:** Ratified, amended by constitution v1.0.2 (2026-09-08)

**Context**: The ADRs define architecture. Spec-kit needs feature descriptions.
Is v1 one spec or many?

**Decision**: **7 spec-kit features with foundation-first.** The
authoritative list is maintained in `.specify/memory/constitution.md`; this
ADR records the ratified breakdown as amended by constitution v1.0.2.

1. `001-foundation` — `core` contracts + DB schema + migrations + backend
   skeleton (Fastify, Kysely, auth, sessions, RBAC, bootstrap admin, local
   auth, OIDC). Milestone: "deploy, log in, see empty dashboard."
2. `002-importer-framework` — run service, scheduler, registry,
   reconciliation, cancellation, observability for runs. Milestone:
   "configure an importer and run it."
3. `003-component-catalog` — component/instance services + UI (listing,
   filtering, `ComponentGroup` grouping), the 7 v1 importers. Milestone:
   "dashboard shows real components."
4. `004-ux-shell` — sidebar shell, state matrix, dark-mode theming,
   health-and-attention dashboard, Ctrl+K global search. Milestone: "navigate
   and theme the dashboard."
5. `005-product-hierarchy` — products, edges, ownership, Platform Product
   workflow, hierarchy UI. Milestone: "model my products."
6. `006-audit-settings` — audit tables, activity feed, history, admin
   settings. Milestone: "observe changes and configure the system."
7. `007-deployment-cicd-docs` — Docker Compose packaging, CI/CD changesets,
   generated docs. Milestone: "install, release, and document Componode."

Dependencies: 001 → 002 → 003 → 004 → 005 → 006 → 007.

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