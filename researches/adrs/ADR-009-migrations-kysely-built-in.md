### ADR-009 — Migrations: Kysely built-in

> **Status:** Ratified

**Context**: Kysely has no built-in migrations tool of its own; a migration
runner is needed.

**Decision**: **Kysely's built-in migration system.** Migrations written in
the same type-safe query builder as the services; one tool owns the data layer.

**Rationale**: Keeps the data layer in one tool — migrations and query code
stay in one mental model and one dependency tree. `node-pg-migrate` is the
fallback if a gap emerges (migrations are just SQL files, switching is cheap).