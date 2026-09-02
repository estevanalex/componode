### ADR-099 — Secure password and credential handling

> **Status:** Ratified

**Context**: [ADR-044](./ADR-044-password-hashing.md) mandates Argon2id but doesn't cover password
complexity, reset flows, secret lifecycle, or timing attacks.

**Decision**: **Comprehensive password/credential handling.** (1) Argon2id
via `@node-rs/argon2`, PHC format, configurable params (OWASP defaults: 19
MiB, 2 iterations, 1 lane). (2) Minimum 12 characters, no maximum, no
complexity rules (NIST SP 800-63B). (3) Password reset: Admin-triggered,
32-byte base64url token, SHA-256 hashed in `password_reset_tokens` table,
15-min expiry, single-use, Admin never knows the new password, email
delivery post-v1. (4) OIDC client secret: `clientSecretRef`, in-memory only
for token exchange. (5) Importer secrets: in-memory only for run duration,
dereferenced after. (6) Bootstrap admin password: read once on empty-DB
boot, hashed immediately. (7) Timing attacks: login hashes a dummy password
for non-existent users. (8) **Session IDs are 32-byte cryptographically
random (base64url), NOT UUID v7 — exception to [ADR-045](./ADR-045-entity-identifier-format.md).** Session tokens are
credentials, not entity identifiers, and require cryptographic randomness.

**Rationale**: The session ID exception to [ADR-045](./ADR-045-entity-identifier-format.md) is critical: UUID v7's
74 bits of randomness is brute-force infeasible but not the standard for
session tokens (256-bit crypto-random is). The token-based reset flow is
more secure than "Admin sets temp password" (the Admin never knows the new
password). The timing-attack mitigation (dummy hash) prevents user
enumeration via response time differences.