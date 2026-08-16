### ADR-016 — Component→Component relationships

**Context**: Components relate to each other in multiple ways (shared
dependencies, code provenance, API exposure).

**Decision**: Three typed component-to-component relationships:
- **`DEPENDS_ON`** (Component → Component): runtime dependency, many-to-many.
  The shared-component case (5 services depend on 1 database = 5 edges).
- **`SOURCES_FROM`** (Component → Component): code provenance (service →
  repository). Many-to-many (one service → many repos, one repo → many
  services). Distinct from `DEPENDS_ON` because deleting a repo doesn't take
  down a running service.
- **`EXPOSES`** (Component → Component): a service component exposes an API
  component. Distinct from `DEPENDS_ON` (a service doesn't "depend on" the API
  it exposes; it *provides* it).

**Rationale**: `DEPENDS_ON` already handles the shared-component case — the
"sharing" is in the graph topology, not a special relationship type. The
Platform Product + `CONSUMES_FROM` pattern ([ADR-018](./ADR-018-product-types-enum-with-enforced-composition-rules.md)) handles governance of
shared infrastructure at the product level.