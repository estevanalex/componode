### ADR-027 — Authentication: built-in local + optional OIDC

> **Status:** Ratified

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