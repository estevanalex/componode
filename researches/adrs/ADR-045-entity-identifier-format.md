### ADR-045 — Entity identifier format

> **Status:** Ratified

**Context**: AGENTS.md says "UUID v7 or ULID" — an unresolved either/or.

**Decision**: **UUID v7, stored as native Postgres `uuid`.** 48-bit
Unix-millisecond timestamp + 74 bits randomness, RFC 9562. The `slug` column
(AGENTS.md) handles human-readable URL references; ULID's Base32 readability
buys nothing.

**Rationale**: PostgreSQL's native `uuid` type is 16 bytes, natively indexed,
universally recognized by tooling. UUID v7's time-sortability satisfies
"time-sortable identifier." ULID-as-text is 26 bytes (~63% larger) with no
benefit when `slug` exists for human-readable refs.

> **EXCEPTION (Session 2, [ADR-099](./ADR-099-secure-password-and-credential-handling.md))**: `sessions.id` is NOT a UUID v7. It is
> a 32-byte cryptographically random token (base64url-encoded `text` column).
> Session tokens are credentials (the cookie value), not entity identifiers,
> and require 256-bit cryptographic randomness. See [ADR-043](./ADR-043-session-storage.md)/ADR-099 for
> details.