### ADR-053 — API authorization: layered default-deny

> **Status:** Ratified

**Context**: [ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md) defines RBAC. How are routes enforced?

**Decision**: **Global default-deny `preHandler` with route-pattern RBAC map
(role gates) + explicit `assertCan*(userId, resourceId)` ownership checks in
the service layer.** Every route requires auth by default; a central RBAC map
declares `(HTTP method, route pattern) → minimum role`. Routes not in the map
are `403` by default. Ownership-sensitive operations get additional service-
layer checks.

**Rationale**: Default-deny is the secure posture (a forgotten `preHandler` on
a new route fails closed, not open). Full ABAC is overkill for v1's three
roles, but the ownership dimension ([ADR-020](./ADR-020-ownership-lineofbusiness-team-person.md)) can't be expressed by route-level
role checks alone. Layered: route gate handles the 90% case; service gate
handles the 10% that needs resource context.