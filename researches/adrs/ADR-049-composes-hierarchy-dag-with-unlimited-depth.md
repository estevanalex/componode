### ADR-049 — COMPOSES hierarchy: DAG with unlimited depth

**Context**: [ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md)'s relationship table says "Child has one parent" (tree),
but the Composable Product Model's reuse intent implies a shared platform
product can be composed into multiple parents (DAG).

**Decision**: **`COMPOSES` is a DAG (many parents per child); unlimited depth;
write-time cycle detection.** A shared platform product can be composed into
multiple business capabilities. Cycle detection is a write-time validation
(reject `COMPOSES` edge that would create a cycle), not a read-time problem.
**This corrects [ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md)'s "one parent per child" cardinality — see the in-place
edit to [ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md) below.**

**Rationale**: The Composable Product Model's entire value is reuse. A tree
forces duplication of shared products or forces everything into
`CONSUMES_FROM` (restricted to `PLATFORM` targets). A DAG with write-time
cycle detection eliminates the infinite-recursion risk. Recursive CTEs with
cycle detection (`WHERE NOT path @> ARRAY[current]`) are a well-trodden
Postgres pattern. If query performance on deep hierarchies becomes an issue,
a materialized path (`ltree`) is an additive optimization — but `ltree`
models tree paths, not DAG paths, so it can't be used directly.