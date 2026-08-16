### ADR-040 — Importer config storage

**Context**: "Importer config" appeared across [ADR-022](./ADR-022-importer-execution-scheduled-on-demand.md)–026 but was never
defined as an entity.

**Decision**: **Single `importer_configs` table, scope/secretRefs as JSONB.**
One row per config: `id`, `importerName`, `label`, `schedule` (cron, nullable),
`scope` (JSONB, importer-specific), `secretRefs` (JSONB array), `enabled`.
Each importer package declares its config schema (JSON Schema) for validation
+ dynamic form rendering.

**Rationale**: The importer-specific variance is what JSONB is for. The core
never queries `scope` by field — it passes `scope` opaquely to the importer,
which validates against its declared schema. Single table serves "list all
configs," "get by id," "find by importerName."