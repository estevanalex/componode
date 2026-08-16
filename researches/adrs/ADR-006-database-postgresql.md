### ADR-006 — Database: PostgreSQL

**Context**: The prior project used Neo4j 5 Community. The Composable Product
Model is graph-shaped, but the v1 headline is importers, not graph analytics.

**Decision**: **PostgreSQL** (replaces Neo4j). Recursive CTEs handle the
product hierarchy; JSONB handles polymorphic components; `ON CONFLICT` upserts
handle importer idempotency.

**Rationale**: For an OSS tool whose v1 headline is importers, contributor
friction on the import path is the thing we can least afford. Every backend dev
writes SQL; far fewer write Cypher. Polymorphic Component types fit Postgres's
typed-table + JSONB pattern cleanly. The PostgreSQL license is permissive.
Neo4j's graph-native traversal is an advantage we collect *later* (blast-radius
analytics, roadmap Phase 4+), not a tax we pay *now*.