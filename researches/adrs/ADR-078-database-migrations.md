### ADR-078 — Database migrations

**Context**: [ADR-009](./ADR-009-migrations-kysely-built-in.md) chose Kysely's built-in migrations. Where do migration
files live and how are enum values handled?

**Decision**: **All migrations in `packages/backend/src/db/migrations/` (TS,
Kysely schema-builder). Enum values as CHECK constraints generated from
`packages/core` constants (not native Postgres ENUMs).** `core` exports
`COMPONENT_CATEGORIES`, `COMPONENT_PROVIDERS`, etc. as `const` arrays; the
migration imports them and generates the CHECK constraint inline. A
`backend`-local helper wraps the CHECK-generation pattern (not in `core` —
keeps `core` pure per [ADR-065](./ADR-065-package-dependency-graph.md)).

**Rationale**: One migration directory, one runner, one history. CHECK
constraints (not native ENUMs) because Postgres ENUMs are immutable-ish
(removing a value requires dropping/recreating the type, which cascades to
every column). The taxonomy will evolve ([ADR-013](./ADR-013-component-taxonomy-24-categories-provider-resourcetype.md)'s 24 categories will grow);
CHECK constraints are migration-friendly (alter the constraint's value list).
Constants imported from `core` = one source of truth, no drift between TS
enum and DB constraint.