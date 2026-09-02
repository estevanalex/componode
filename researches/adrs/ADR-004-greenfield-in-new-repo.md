### ADR-004 — Greenfield in new repo

> **Status:** Ratified

**Context**: Nearly every architectural decision changes a load-bearing layer
of the prior project (Neo4j→Postgres, multi-tenant→single-org, Cypher→Kysely,
no importers→importer framework, etc.).

**Decision**: **Greenfield rewrite in a new repo** at
`github.com/estevanalex/componode`. The prior repo
(`D:\Repositories\test-project`) becomes the research/specs archive.

**Rationale**: The migration depth is too large for incremental migration.
A clean repo gives a clean public commit history with no trace of the prior
multi-tenant SaaS work. The old code remains in git history in the archive repo.