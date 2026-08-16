### ADR-038 — Importer run resume strategy

**Context**: [ADR-037](./ADR-037-importer-run-commit-strategy.md)'s incremental commits enable resume. But "where it left
off" needs a precise definition given importers are non-deterministic
generators.

**Decision**: **Run-level restart — re-run from zero, rely on upsert
idempotency.** No checkpoint state. A failed run is retried from the beginning;
re-processing already-committed assets is a no-op (same upsert key). Resume =
retry.

**Rationale**: Keeps the importer contract unchanged (`AsyncGenerator<
DiscoveredAsset>`, nothing more). Upsert idempotency makes re-running safe.
The cost (re-pulling from source API on failure) is bounded — most failures
are early (auth, config), not late. Large accounts should split importer
configs per region for parallelism, not complicate the contract.