### ADR-080 — Pagination strategy

> **Status:** Ratified

**Context**: List endpoints need pagination. A deployer with 50,000 components
needs it.

**Decision**: **Cursor-based for high-cardinality (components, instances, runs,
audit logs) + offset-based for low-cardinality (products, LOBs, teams,
persons, importer configs).** Cursor is `(createdAt, id)` (UUID v7 is time-
sortable per [ADR-045](./ADR-045-entity-identifier-format.md)). Frontend `usePaginatedQuery` hook abstracts both.

**Rationale**: Cardinality asymmetry is real (5-20 products vs 50,000
components). Forcing cursor on products loses "page 1 of 2" UX; forcing offset
on components makes `OFFSET 40000` a 2-second query. Right tool per endpoint.
Estimated counts (`pg_class.reltuples`) for display if needed ("~50,000
components").