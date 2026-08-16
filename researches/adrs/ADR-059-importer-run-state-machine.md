### ADR-059 — Importer run state machine

**Context**: Across [ADR-037](./ADR-037-importer-run-commit-strategy.md), [ADR-054](./ADR-054-rbac-permission-matrix.md), [ADR-058](./ADR-058-importer-cancellation.md) we referenced several run
statuses. The full state machine needs to be pinned down.

**Decision**: **`PENDING → RUNNING → {COMPLETED, FAILED, CANCELLED,
INTERRUPTED}`.** `PENDING` = run created, importer not yet invoked. `RUNNING`
= generator active. `COMPLETED` = importer finished, all assets committed,
phase-2 done (the only status that triggers phase-2 reconciliation per
[ADR-036](./ADR-036-two-phase-reconciliation-scope.md)/ADR-037). `FAILED` = importer threw or per-asset commit failed
irrecoverably (process alive, error captured). `CANCELLED` = admin cancelled
or restart found `cancelRequestedAt`. `INTERRUPTED` = backend crashed mid-run,
no cancel requested (set by the restart recovery loop). No `PAUSED` state —
cancellation is terminal; start a new run to retry ([ADR-038](./ADR-038-importer-run-resume-strategy.md)).

**Rationale**: `COMPLETED` is the only status that triggers phase-2 (preserves
the [ADR-036](./ADR-036-two-phase-reconciliation-scope.md) invariant). `FAILED` vs `INTERRUPTED` distinguishes "code bug"
(process alive, error captured) from "infra event" (process gone) — matters
for ops triage. `PENDING` exists because the trigger API may create the run
record before the importer is invoked. No `PAUSED` avoids pause/resume
complexity.