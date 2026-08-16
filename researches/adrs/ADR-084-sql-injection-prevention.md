### ADR-084 — SQL injection prevention

**Context**: Kysely parameterizes by default, but exposes `sql.raw()` and
`sql.fragment()` for advanced cases. A contributor hitting a query-builder
limitation (e.g. [ADR-051](./ADR-051-hierarchy-traversal-merged-cte-with-edge-types.md)'s recursive CTE) might reach for `sql.raw()` and
introduce a SQL injection vector.

**Decision**: **All database queries MUST use Kysely's parameterized query
builder.** `sql.raw()` and `sql.fragment()` are PROHIBITED in application
code (services, routes, repositories). In migrations, `sql.raw()` is
permitted for DDL the builder cannot express (e.g. trigger creation for
[ADR-050](./ADR-050-composes-cycle-detection-implementation.md)'s cycle detection), with a `// SECURITY: raw SQL in migration, no
user input` comment. Any `sql.raw()` in application code requires a
documented security justification in the PR and a `// SECURITY:` comment. A
CI grep check flags `sql.raw()` usage without the comment.

**Rationale**: Kysely's builder is the default safe path. The exception for
migrations acknowledges that triggers and CHECK constraints ([ADR-078](./ADR-078-database-migrations.md)) need
raw DDL. The CI grep check makes the `// SECURITY:` comment requirement
enforceable, not just "reviewed by a human."