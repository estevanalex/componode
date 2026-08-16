### ADR-022 — Importer execution: scheduled + on-demand

**Context**: Importers need to keep the asset inventory current.

**Decision**: **Scheduled (cron) + on-demand.** In-process scheduler
(`node-cron` or similar) + `import_runs` history table. Each importer config
has a schedule (e.g. "every 1h", "daily"); users can also trigger manual runs.

**Rationale**: On-demand only is too manual for an asset-inventory tool whose
value is "always-current picture." Event/webhook-driven is too complex for v1.
Scheduled + on-demand matches cartography/Steampipe/Prowler.