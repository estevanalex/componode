### ADR-035 — Instance reconciliation: orphan missing instances

> **Status:** Ratified

**Context**: An importer yields a component with `instances[]`. What happens to
instance rows from a previous run that are absent from the current yield?

**Decision**: **Orphan the missing instances — set `status = GONE`, keep the
row, add `lastSeenAt`/`lastSeenInRunId`.** Re-appearance next run flips
`status` back.

**Rationale**: Matches ServiceNow CMDB, cartography, AWS Config (retain
retired records with status flip, not hard-delete). Resilient to transient API
failures. Preserves blast-radius/audit value. `ComponentInstance.status` gains
`GONE` ([ADR-014](./ADR-014-environment-separate-componentinstance-entity.md)'s `...` was always meant to grow).