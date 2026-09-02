### ADR-068 — OpenTelemetry tracing integration

> **Status:** Ratified

**Context**: [ADR-032](./ADR-032-observability-full.md) mandates OTel. How do importers participate?

**Decision**: **Run-level span always created by core + abstracted `Tracer`/
`Span` interfaces in `core` (pure TS, no OTel dep) + opt-in child spans for
importers.** The backend's `RunService` starts an OTel span (`importer.run`)
before invoking `importer.run()`, sets span attributes (`runId`,
`importerName`, `configId`), ends it on finish/error/cancel. The context
includes an optional `tracer?: Tracer` — importers that want fine-grained
tracing call `context.tracer.startSpan("scan-ec2")`; importers that don't are
still traced at the run level. The backend implements `Tracer`/`Span` as OTel
wrappers.

**Rationale**: Satisfies [ADR-032](./ADR-032-observability-full.md)'s "instrumented from day one" (run-level span
always there), [ADR-065](./ADR-065-package-dependency-graph.md)'s "core has no runtime deps" (interfaces only, OTel
implementation in `backend`), and the contributor contract's "importers are
simple" (tracing is opt-in). The 7 v1 importers (core-team-written) use child
spans for rich traces; contributor importers get the run-level span for free.
The abstracted interfaces are 4-method (startSpan, end, setAttribute,
recordError) — minimal, testable with mocks.