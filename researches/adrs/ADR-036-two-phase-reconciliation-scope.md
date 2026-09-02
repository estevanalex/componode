### ADR-036 — Two-phase reconciliation scope

> **Status:** Ratified

**Context**: Q35's orphan logic needs a scope boundary — what set of existing
rows do we compare the current yield against?

**Decision**: **Two phases.** (1) Per-component during the run: orphan
`ComponentInstance` rows absent from the yielded `instances[]`. (2) At
successful run end: components previously touched by this importer config but
not yielded this run get `Component.lifecycle = RETIRED`, cascading to orphan
their instances. Phase 2 only runs if `import_runs.status = COMPLETED`.

**Rationale**: Phase 1 handles instance-level disappearance; phase 2 handles
whole-component disappearance (terminated EC2 instance no longer yielded).
Uses `ComponentInstance.status` and `Component.lifecycle` for their designed
purposes. Partial-run risk mitigated by gating phase 2 on successful
completion.