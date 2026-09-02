### ADR-064 — Importer validation harness

> **Status:** Ratified

**Context**: [ADR-029](./ADR-029-testing-shared-importer-harness-integration-tests.md) says "shared harness." What does it check and where does
it run?

**Decision**: **Shared `validateDiscoveredAsset` in `packages/core`; test-time
harness for contributor feedback + runtime validation in the core; invalid
assets logged to `import_run_errors` ([ADR-063](./ADR-063-importer-error-surfacing.md)) and skipped.** Importer
packages use the harness in unit tests (catches issues during development).
The core uses the same function at runtime (catches issues from untested
importers or edge cases). One function, no drift.

**Rationale**: A's "trust the importer" is too fragile — one malformed run
corrupts the DB. Runtime-only loses [ADR-029](./ADR-029-testing-shared-importer-harness-integration-tests.md)'s test-time harness value
(contributors get no fast feedback). Both gives defense in depth + one source
of truth. The runtime cost is negligible (enum membership + required-field
presence + type checks, all in-memory, sub-millisecond per asset).