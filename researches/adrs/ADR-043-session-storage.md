### ADR-043 — Session storage

> **Status:** Ratified

**Context**: [ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md) mandates server-side, revocable sessions but doesn't
specify storage.

**Decision**: **Postgres `sessions` table.** `sessions(id, userId, createdAt,
lastSeenAt, expiresAt, revokedAt)`. Each authenticated request loads the
session by indexed PK (sub-millisecond), checks `revokedAt IS NULL` and
`now() < expiresAt`, updates `lastSeenAt` (write-throttled to once per 60s).
Revocation = `UPDATE ... SET revokedAt`. "Revoke all for user" = `WHERE userId
= ?`.

> **CORRECTION (Session 2, [ADR-099](./ADR-099-secure-password-and-credential-handling.md))**: `sessions.id` is a **32-byte
> cryptographically random token** (base64url-encoded), NOT a UUID v7. This
> is an exception to [ADR-045](./ADR-045-entity-identifier-format.md)'s "UUID v7 for all entities" — session tokens
> are credentials (the cookie value), not entity identifiers, and require
> cryptographic randomness (256-bit). UUID v7's 74 bits of randomness is
> brute-force infeasible but not the standard for session tokens. The
> `sessions.id` column is `text` (not `uuid`) to hold the base64url token.

**Rationale**: Satisfies "checked on every request" + "revocable" without
adding Redis. A session lookup by indexed PK is sub-millisecond on Postgres;
v1 is a single-org internal tool, not a high-traffic public site. "List active
sessions" and "revoke all for user" are trivial queries. An in-process LRU
cache is an additive optimization if needed later.