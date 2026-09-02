### ADR-051 — Hierarchy traversal: merged CTE with edge types

> **Status:** Ratified

**Context**: `COMPOSES` and `CONSUMES_FROM` both build the product hierarchy.
Do they form one merged graph or two separate graphs in queries?

**Decision**: **Merged recursive CTE over `COMPOSES` + `CONSUMES_FROM`,
emitting `edgeType` per hop.** One query, full hierarchy, but the caller can
distinguish how each descendant was reached (for UI coloring, filtering,
governance rules). The recursive term is a `UNION ALL` of the two edge tables,
with an `edgeType` literal in each branch.

**Rationale**: The user's mental model is one hierarchy ("everything under
Checkout"). Silent merge loses semantic information that matters (the Platform
Product workflow rewrites `DEPENDS_ON` into `CONSUMES_FROM`; the governance
value is in *seeing* which dependencies are platform-consumed vs.
directly-composed). Future-proofs: a third hierarchy edge type adds one more
`UNION ALL` branch, not a new query.