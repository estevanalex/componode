### ADR-047 — Deletion model

**Context**: ADRs define `lifecycle`/`status` but never specify "delete"
across the schema.

**Decision**: **`lifecycle`/`status` are the soft-delete for graph entities;
hard-delete for operational entities.** `DigitalProduct`/`Component` use
`lifecycle=RETIRED`; `ComponentInstance` uses `status=GONE`; `ComponentGroup`
uses `lifecycle=RETIRED`. `importer_configs`, `sessions`, `import_runs`,
`Person`, `Team`, `LineOfBusiness` are hard-deletable. Bulk-retire-by-config
("retire all components last touched by config X") is an admin feature on top.

**Rationale**: `lifecycle` and `status` *are* the soft-delete mechanism for
graph entities — adding a separate `deletedAt` creates a redundant field with
unclear semantics. Hard-delete for non-graph entities is correct (a deleted
user's session shouldn't linger). GDPR "delete my account" = hard-delete
`Person` after reassigning ownerships.