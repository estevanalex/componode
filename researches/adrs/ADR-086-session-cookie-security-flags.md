### ADR-086 — Session cookie security flags

> **Status:** Ratified

**Context**: [ADR-043](./ADR-043-session-storage.md) mandates server-side sessions. The session ID is the
cookie value. Without `HttpOnly`/`Secure`/`SameSite`, the cookie is
vulnerable to XSS theft, HTTP sniffing, and CSRF.

**Decision**: **`HttpOnly: true`, `Secure: true` in production, `SameSite:
Lax`.** Cookie name configurable (`SESSION_COOKIE_NAME`, default
`componode_session`). In dev, `Secure` is automatically `false` when
`NODE_ENV !== 'production'` (implicit, cannot be forgotten). A deployer
running production without TLS can explicitly set `SESSION_COOKIE_SECURE=
false`. `SameSite: Strict` is an optional deployer setting
(`SESSION_COOKIE_SAMESITE=strict`). No `__Host-` / `__Secure-` prefix in v1
(dev-HTTP conflict).

**Rationale**: `Lax` blocks CSRF-relevant verbs (POST/PUT/DELETE) while
allowing top-level GET navigations (standard for single-org tools).
`Strict` is available for high-security environments. The implicit dev
override (`NODE_ENV`) avoids the "forgot to set the env var" failure mode.
No `__Host-` prefix because it requires TLS in all environments.