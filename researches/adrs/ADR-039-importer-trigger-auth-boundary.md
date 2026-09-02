### ADR-039 — Importer trigger auth boundary

> **Status:** Ratified

**Context**: [ADR-022](./ADR-022-importer-execution-scheduled-on-demand.md) says scheduled + on-demand. [ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md) defines RBAC. Who can
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