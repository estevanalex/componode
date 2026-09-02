### ADR-031 — CI/CD: GitHub Actions + changesets

> **Status:** Ratified

**Context**: CI is what enforces the importer contract at the gate.

**Decision**: **GitHub Actions (lint + typecheck + unit + integration) +
changesets (automated versioning/changelog/npm publish).**
- Lint + typecheck + unit tests (with importer harness) on every PR.
- Integration tests on PR + push to main.
- Changesets: contributors add a changeset describing their change; merges to
  main auto-publish updated packages to npm with generated changelogs.

**Rationale**: Without CI gating the importer contract, the harness is just a
local suggestion. Changesets removes the release bottleneck — this is how
Backstage, Turborepo, and most modern TS monorepos ship.