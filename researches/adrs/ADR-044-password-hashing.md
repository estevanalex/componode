### ADR-044 — Password hashing

**Context**: [ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md) says "username/password" but doesn't specify the scheme.

**Decision**: **Argon2id via `@node-rs/argon2`, PHC-format storage.** OWASP
primary recommendation, memory-hard (GPU-resistant), no 72-byte truncation
footgun. `@node-rs/argon2` ships prebuilt binaries for Windows/Linux/macOS/
arm64.

**Rationale**: OWASP primary. `@node-rs/argon2` has first-class Windows
prebuilt support (AGENTS.md notes Windows as the OS environment). PHC-format
storage enables per-user rehash-on-login migration if the scheme ever changes
— but starting with Argon2id means no migration for years.