### ADR-067 — Logger abstraction

**Context**: [ADR-056](./ADR-056-importer-interface-signature.md)'s context includes `logger`. [ADR-032](./ADR-032-observability-full.md) mandates Pino. Do
importers receive raw `pino.Logger` or an abstraction?

**Decision**: **Abstracted `Logger` interface in `packages/core` with
`debug/info/warn/error(msg, meta?)` + `child(meta): Logger`.** The backend
implements it as a thin Pino wrapper. Importers depend only on `core`'s
interface (no `pino` dep). The backend creates a child logger scoped with
`{runId, importerName, configId}` and passes it to the importer, so every log
line automatically carries correlation IDs.

**Rationale**: Direct-Pino coupling means every importer carries a `pino`
dependency and is locked to Pino's API. The abstraction costs nothing (a
5-method interface) and buys decoupling + testability. The `child(meta)`
method is essential for run-correlation ([ADR-032](./ADR-032-observability-full.md)'s tracing requires it) and
is a common logging pattern (Bunyan originated it; Pino/Winston/pino-http all
use it), not a Pino leak. The `Logger` interface lives in `core` (pure TS, no
runtime deps — [ADR-065](./ADR-065-package-dependency-graph.md)'s invariant holds).