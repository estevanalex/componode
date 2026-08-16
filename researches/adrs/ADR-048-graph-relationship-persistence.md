### ADR-048 — Graph relationship persistence

**Context**: [ADR-016](./ADR-016-component-component-relationships.md) defines 10 relationship types. [ADR-006](./ADR-006-database-postgresql.md) chose Postgres
over Neo4j — edges must be tables.

**Decision**: **FKs for 1-to-many; typed junction tables with CHECK constraints
for many-to-many; no polymorphic `edges` table.** `HAS_INSTANCE` (component→
instance), `OWNS` (LOB/team→product/component), `BELONGS_TO` (person→team) are
FKs on the owned entity. `COMPOSES`, `CONSUMES_FROM`, `DEPENDS_ON` (product→
component), `DEPENDS_ON` (component→component), `SOURCES_FROM`, `EXPOSES` get
junction tables with typed FKs and per-relationship CHECK constraints.

**Rationale**: Uses the correct relational primitive for each cardinality.
Junction tables for 1-to-many are an anti-pattern. The ADRs already enumerate
the exact 10 relationship types (fixed set), so a polymorphic `edges` table's
"zero-schema-change" benefit is moot. Full referential integrity; per-
relationship indexes; CHECK constraints for composition rules ([ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md)).