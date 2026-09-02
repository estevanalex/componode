### ADR-050 — COMPOSES cycle detection implementation

> **Status:** Ratified

**Context**: [ADR-049](./ADR-049-composes-hierarchy-dag-with-unlimited-depth.md) mandates write-time cycle detection. How is it
implemented?

**Decision**: **`BEFORE INSERT` trigger on `product_composes` runs a DFS cycle
check.** The trigger executes a recursive CTE ("starting from `childId`, can I
reach `parentId` by following existing `COMPOSES` edges?") within the insert's
transaction. If a cycle would be created, raise a structured exception. The
application catches the exception and returns `409 Cycle detected` with the
cycle path.

**Rationale**: Race-safe (the trigger runs within the insert's transaction,
holding the row lock). Un-bypassable (bugs in application code can't skip it).
A cycle in `COMPOSES` breaks every hierarchy query (infinite recursion in the
CTE from [ADR-051](./ADR-051-hierarchy-traversal-merged-cte-with-edge-types.md)), so the invariant must be DB-enforced. The DFS is fast for
typical hierarchy depths with indexes on `(parentId)` and `(childId)`. If
latency becomes a problem at scale, a materialized-path cache (a `text[]` of
ancestor IDs maintained by trigger) is an additive optimization.