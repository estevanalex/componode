### ADR-063 — Importer error surfacing

**Context**: A run can fail in several ways. How are errors stored and
surfaced?

**Decision**: **Terminal error (`errorMessage`, `errorType`, `errorStack`) on
`import_runs` + non-terminal per-asset errors in `import_run_errors` table.**
The run-level fields capture the *terminal* error (the one that set `status =
FAILED`) with stack trace. `import_run_errors(id, runId, assetExternalId?,
errorType, message, occurredAt)` captures *non-terminal* errors (assets that
failed but the run continued — e.g. a malformed asset was skipped).

**Rationale**: The terminal error belongs on the run row (the answer to "why
did this run fail?" visible without a join). The stack trace is essential for
ops triage ([ADR-059](./ADR-059-importer-run-state-machine.md)'s `FAILED` vs `INTERRUPTED` — `FAILED` has an error,
`INTERRUPTED` doesn't). Non-terminal errors belong in a separate table (the
answer to "this run completed but 5 assets had problems, which ones?"). The
split is by error category (terminal vs non-terminal), the natural query
boundary.