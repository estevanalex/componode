### ADR-062 — Importer run progress reporting

> **Status:** Ratified

**Context**: [ADR-060](./ADR-060-importer-run-coordination.md)'s poll returns status. But status alone doesn't tell the
user *where* the run is.

**Decision**: **Poll returns `{status, assetsProcessed, currentPhase?}`.
`context.reportPhase(name)` callback on the run context ([ADR-056](./ADR-056-importer-interface-signature.md)). No
estimated total.** `assetsProcessed` is the raw count (incremented per-asset
commit per [ADR-037](./ADR-037-importer-run-commit-strategy.md)). `currentPhase` is an optional string the importer updates
via the callback. The UI shows "Running… Scanning RDS · 1,247 assets" — phase
gives qualitative context, count gives scale, no fake percentage.

**Rationale**: An estimated total is false precision — AWS resource counts
shift mid-scan, GitHub repos are created/deleted, and a wrong estimate is
worse than no estimate. Phase + count gives enough to know it's working and
roughly where it is. `reportPhase` is a context callback, not a special yield
— the `AsyncGenerator<DiscoveredAsset>` contract stays clean. Importers that
don't implement it simply omit phases.