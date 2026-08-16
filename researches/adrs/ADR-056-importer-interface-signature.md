### ADR-056 — Importer interface signature (supersedes ADR-025)

**Context**: [ADR-025](./ADR-025-importer-interface-pull-only-asyncgenerator.md) says `run(config, secretResolver)`. [ADR-055](./ADR-055-importer-secret-resolution.md) pre-resolves
secrets. The signature needs reconciliation + observability/cancellation
hooks.

**Decision**: **`run(config, secrets, context): AsyncGenerator<DiscoveredAsset>`
where `context = {runId, logger, signal, reportPhase, tracer?}`.** `config` is
the typed scope from `importer_configs.scope` (validated against the
importer's declared schema). `secrets` is the resolved `Record<string,
string>`. `context.logger` is the abstracted `Logger` from `core` ([ADR-067](./ADR-067-logger-abstraction.md)).
`context.signal` is an `AbortSignal` for cancellation ([ADR-058](./ADR-058-importer-cancellation.md)).
`context.reportPhase(name)` updates `import_runs.currentPhase` for progress
([ADR-060](./ADR-060-importer-run-coordination.md)). `context.tracer?` is an optional abstracted `Tracer` for opt-in
child spans ([ADR-068](./ADR-068-opentelemetry-tracing-integration.md)). **This supersedes [ADR-025](./ADR-025-importer-interface-pull-only-asyncgenerator.md)'s `run(config, secretResolver)`
signature.**

**Rationale**: Pre-resolved `secrets` replaces `secretResolver` ([ADR-055](./ADR-055-importer-secret-resolution.md)).
`config` is just the `scope` (the importer doesn't need operational fields).
`context` is the necessary addition: [ADR-032](./ADR-032-observability-full.md) mandates Pino + OTel from day
one; the importer needs a logger to participate; `AbortSignal` is essential
for "admin cancels a runaway run"; `runId` enables log correlation;
`reportPhase` enables progress reporting without contract pollution.