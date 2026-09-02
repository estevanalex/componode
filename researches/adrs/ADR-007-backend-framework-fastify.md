### ADR-007 — Backend framework: Fastify (kept)

> **Status:** Ratified

**Context**: The prior project used Fastify + neo4j-driver. The DB change
doesn't force a framework change.

**Decision**: **Keep Fastify.** Pair with a TypeScript-first Postgres layer
(Kysely, [ADR-008](./ADR-008-data-layer-kysely.md)). The importer-module pattern is a TypeScript interface +
registry, not a framework swap.

**Rationale**: Fastify is already in place, TS-friendly, its plugin system is
good enough for an importer-module pattern. Switching frameworks burns time we
want to spend on importers.