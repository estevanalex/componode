### ADR-001 — Deployment model: self-hosted single-organization tool

> **Status:** Ratified

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