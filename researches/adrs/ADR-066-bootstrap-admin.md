### ADR-066 — Bootstrap admin

> **Status:** Ratified

**Context**: A fresh deployment has an empty DB — no users, no way to log in.
[ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md)'s OIDC JIT creates Viewers; no one can promote to Admin.

**Decision**: **Env-var bootstrap admin on fresh DB + CLI `promote-admin` for
recovery.** `BOOTSTRAP_ADMIN_USERNAME` + `BOOTSTRAP_ADMIN_PASSWORD` env vars
create the first Admin (Argon2id-hashed per [ADR-044](./ADR-044-password-hashing.md)) when the DB is empty.
The env vars are only read when the DB is empty (subsequent boots ignore them
— safe to remove from `compose.yml` after bootstrap). A separate `pnpm
backend promote-admin --username X` CLI command exists for recovery (locked
out, or creating additional Admins without UI access).

**Rationale**: Env-var bootstrap is the standard pattern (Grafana, Supabase,
Postgres). The "password in env var" concern is mitigated by documenting
"change this password immediately via the UI after first login" and removing
the env var post-bootstrap. The CLI is the right escape hatch for "I locked
myself out" — requires container access (which the deployer has), not a
security bypass.