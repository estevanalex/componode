### ADR-091 — No secrets in commits

**Context**: A committed secret is permanently in git history. For an
open-source project on GitHub, a committed AWS key is scraped by bots and
used for cryptomining within minutes.

**Decision**: **Secrets MUST NOT be committed.** `.gitignore` includes
`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `secrets/`. CI MUST run a
secret scanner on every PR (enforceable boundary). Pre-commit hook (via
`husky`) is a SHOULD (bypassable with `--no-verify`). The example
`docker-compose.yml` uses `${BOOTSTRAP_ADMIN_PASSWORD:?must set}` and
`env_file: .env`. `.env.example` files use placeholder values. Test
fixtures use clearly fake values and are allow-listed in the scanner config.
If a secret is committed: revert (force-push to rewrite history if
sensitive — exception to the "no force-push" rule), rotate, document in a
post-mortem.

**Rationale**: CI is the enforceable boundary (PRs can't bypass it). The
force-push exception for secret removal overrides the general "no
force-push" rule — the cost of a leaked secret in history exceeds the cost
of rewriting history. Test fixtures are allow-listed to avoid false
positives on `test:test` credentials.