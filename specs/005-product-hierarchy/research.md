# Phase 0 Research: Product hierarchy

All technical questions resolved against existing code and ratified ADRs —
no open unknowns.

## Decisions

### Tree data: flat fetch + client-side tree build

- **Decision**: `GET /api/v1/products` returns `{ products: [...], edges:
  [{ parentId, childId }] }`; the frontend builds the expandable tree.
- **Rationale**: SC-001 caps the graph at ~1k products — one indexed query
  plus an in-memory adjacency map is simpler than server-side traversal and
  expansion is in-memory-only (no per-node fetch). Search/filter just flattens
  the same payload.
- **Alternatives**: server-side recursive CTE returning nested JSON
  (rejected — unnecessary serialization complexity at this scale); lazy
  per-node fetch (rejected — N queries, breaks expand-all).

### Cycle detection: service-layer write-time DFS

- **Decision**: before inserting a `product_composes` row, run a reachability
  check (DFS/CTE over `childId` descendants of the candidate child) — if the
  parent is reachable, reject `409 CYCLE` with code `CYCLE_DETECTED`.
- **Rationale**: ADR-049 mandates write-time detection; ADR-050 sketches the
  merged-CTE approach. A Kysely `withRecursive` query (parameterized, no
  `sql.raw`) inside the insert transaction is fast at DAG scale.
- **Alternatives**: deferred/periodic validation (rejected — violates
  write-time invariant); DB trigger (rejected — logic lives in service).

### Type-rule enforcement: same write-time guard, two doors

- **Decision**: `validateEdge()` enforces ADR-018 on edge insert — COMPOSES
  parent must be `BUSINESS_CAPABILITY`/`CUSTOMER_FACING`, CONSUMES_FROM target
  must be `PLATFORM` → `422 INVALID_EDGE_TYPE`. Product `type` updates run the
  inverse check against *existing* edges → `409 TYPE_CHANGE_BLOCKED` with the
  offending edges in `details`.
- **Rationale**: guards the invariant at both write surfaces (grilling Q9-B).
- **Alternatives**: immutable type (rejected — typo recovery too costly);
  silent sever (rejected — destructive).

### Delete guards

- **Decision**: `DELETE /products/:id` → `409 REFERENCED` unless the product
  has zero edges in all three junctions; `DELETE /lobs|teams/:id` → `409
  REFERENCED` while the entity owns anything or (teams) has members. Errors
  carry counts in `details`.
- **Rationale**: grilling decisions — delete is an "undo a mistake" hatch;
  `onDelete cascade`/`set null` would otherwise silently sever/strip.
- **Alternatives**: unrestricted delete + confirm (rejected — silent bulk
  edits); archive flags (rejected — no columns, out of migration scope).

### Inherited dependencies: bounded recursive read

- **Decision**: product detail computes **Inherited** components via a
  `withRecursive` CTE over `product_composes` (descendants), then joins
  `product_depends_on_component`; each row carries the source product so the
  UI can show provenance. Instances tab reuses the same resolved component id
  set, grouped by `environment`.
- **Rationale**: matches ADR-051's merged-CTE direction; read-only.
- **Alternatives**: client-side walk (rejected — N+1 fetches); merged single
  list (rejected — hides provenance, per clarify Q1).

### Audit: same-transaction writes

- **Decision**: every mutation inserts `entity_changes` (`entityType`,
  `entityId`, `action`, `changes` jsonb, `createdBy`, `createdByName`) and/or
  `edge_changes` (`edgeType`, `fromEntityType/Id`, `toEntityType/Id`, action)
  in the same Kysely transaction as the write.
- **Rationale**: append-only audit per ADR-048 + spec FR-007.
- **Alternatives**: out-of-band eventing (rejected — overkill, no event bus).

### Org entities: flat CRUD, EDITOR-gated

- **Decision**: `/lobs` and `/teams` get list/create/edit/delete + team
  roster (`persons.teamId`, read-only). Permission keys `product:*`,
  `lob:*`, `team:*` added to `PERMISSIONS` as `EDITOR` (clarify Q4).
- **Rationale**: unblocks ownership pickers; `Person` stays under existing
  Users admin (no duplication).
- **Alternatives**: ADMIN-only (rejected — bottlenecks curation).

### Routing: slug-addressed products

- **Decision**: `/products/:slug`; API accepts slug in path (lookup by
  `slug` column) while edge mutations reference `id`s in bodies.
- **Rationale**: docs/ux.md route map + ADR-046 human-readable refs; rename
  moves URL with no redirect (documented limitation, clarify Q3).
