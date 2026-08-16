### ADR-008 — Data layer: Kysely

**Context**: The prior project used the Neo4j driver directly (no ORM). For
Postgres in TypeScript, the options are ORM, query builder, or raw SQL.

**Decision**: **Kysely** (query builder, no ORM). Type-safe fluent SQL,
recursive CTEs for hierarchy, JSONB for polymorphic components, `ON CONFLICT`
upserts for importers — all first-class.

**Rationale**: v1 is dominated by polymorphic Component queries, recursive
CTEs, and importer upserts — exactly what Kysely is best at and ORMs are
weakest at. No schema-codegen workflow imposed on contributors. Pairs with
Kysely's built-in migration system ([ADR-009](./ADR-009-migrations-kysely-built-in.md)).