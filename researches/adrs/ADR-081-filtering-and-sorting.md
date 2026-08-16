### ADR-081 — Filtering and sorting

**Context**: List endpoints need filtering and sorting.

**Decision**: **Fixed query params per endpoint, AND-only, single-value
filters in v1. `sort=field:direction` with allow-listed sortable fields.**
Each endpoint declares its supported filters (e.g.
`GET /api/v1/components?category=COMPUTE&provider=AWS&lifecycle=ACTIVE`).
Ranges and OR-combinations are v1.1 needs.

**Rationale**: v1 UI's filter needs are single-value, AND-combined (category
select, provider select, lifecycle select, owner select). A generic filter
DSL is overkill and creates a security surface (arbitrary column filtering).
Ranges/OR can be added later as multi-value params or a structured filter
extension without breaking existing params. Sort allow-list prevents sorting
on unindexed columns.