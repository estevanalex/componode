### ADR-075 — Self-registration

> **Status:** Ratified

**Context**: [ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md) defines local auth. Can users self-register?

**Decision**: **`allowSelfRegistration` flag (default `false`, secure-by-
default).** When enabled, `/register` is public and new users are Viewer
(per [ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md)); Admin promotes via UI. When disabled (default), only Admins
create accounts. Stored in `app_settings` ([ADR-076](./ADR-076-app-settings-storage.md)).

**Rationale**: Matches the deployment-model flexibility. An internal-only
deployment (behind a VPN) reasonably wants open registration; a public-facing
deployment wants closed. Default `false` (secure-by-default, matches [ADR-053](./ADR-053-api-authorization-layered-default-deny.md)'s
default-deny). Invite-based registration is a v1.1 enhancement (token
management is a mini-feature).