### ADR-092 — Dependency scanning

**Context**: The dependency tree is the largest external attack surface
(npm supply chain). A vulnerable dependency is exploitable even if
Componode's own code is secure.

**Decision**: **CI MUST run a dependency vulnerability scanner on every
PR.** `high`/`critical` severity blocks the PR (CI fails), unless the
vulnerability is in a dev-only dependency that does not ship to production
AND the PR includes a `// SECURITY:` comment. `moderate`/`low` are warnings.
Dependencies MUST be pinned to exact versions (no `^` or `~`). Version
bumps via `changesets` or dedicated PR. Newly published versions (less than
7 days old) MUST NOT be used.

**Rationale**: Exact pinning prevents floating ranges from auto-resolving
to new (potentially malicious) versions. The 7-day rule extends the
existing AGENTS.md rule to version bumps of existing deps. The dev-only
override prevents blocking PRs for non-exploitable vulnerabilities in test
utilities.