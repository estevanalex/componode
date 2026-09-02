### ADR-098 — Importer sandboxing

> **Status:** Ratified

**Context**: [ADR-065](./ADR-065-package-dependency-graph.md) mandates importers depend only on `core`. But
dependency boundaries don't prevent a compromised importer from reading
`process.env.DATABASE_URL`, spawning a child process, or reading
`~/.ssh/id_rsa`.

**Decision**: **ESLint `no-restricted-imports` and `no-restricted-syntax`
in importer packages.** PROHIBITED: `fs`, `fs/promises`, `fs-extra`,
`process.env`, `child_process`, `execa`, `shelljs`, `eval`, `new Function`,
`vm`, `import()`. PERMITTED: `fetch`/HTTP clients, `Logger`/`Tracer` from
`core`, `validateDiscoveredAsset` from `core`, the importer's own package
files. SDKs that default to `process.env` MUST be configured with explicit
values from `secrets`/`config`. True process-level sandboxing (worker
threads, separate containers) is post-v1. The ESLint rules are static
enforcement — they prevent accidental leakage and catch malicious PRs at
the CI boundary, but do not protect against a determined attacker who
bypasses ESLint and passes review.

**Rationale**: Static ESLint enforcement is the pragmatic v1 choice (the 7
importers are core-team-written, contributor importers are reviewed PRs).
The "no requests to own API" constraint was dropped (unforceable via static
analysis — ESLint cannot determine the runtime URL of a `fetch()` call).