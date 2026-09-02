### ADR-087 — CSRF protection

> **Status:** Ratified

**Context**: [ADR-086](./ADR-086-session-cookie-security-flags.md)'s `SameSite: Lax` blocks cross-site POST/PUT/DELETE on
modern browsers, but legacy browsers and subdomain attacks are gaps.

**Decision**: **Double-submit cookie pattern on all state-changing routes
(`POST`/`PUT`/`PATCH`/`DELETE`).** The backend sets a CSRF token cookie
(`componode_csrf`, `HttpOnly: false`, `SameSite: Lax`, `Secure` matches
session cookie), and the frontend sends the token as an `X-CSRF-Token`
header on every state-changing request. The backend's `preHandler` compares
cookie to header — mismatch = `403`. Universal (not conditional on
deployment type). GET routes MUST NOT have side effects ([ADR-094](./ADR-094-get-routes-must-not-have-side-effects.md)).

**Rationale**: Double-submit is stateless and simple (no server-side token
store). Layered with `SameSite: Lax` ([ADR-086](./ADR-086-session-cookie-security-flags.md)). Universal because the
complexity is the same either way, and a public-facing deployment
([ADR-075](./ADR-075-self-registration.md)) is a real CSRF target.