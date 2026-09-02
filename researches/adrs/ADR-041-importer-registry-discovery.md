### ADR-041 — Importer registry discovery

> **Status:** Ratified

**Context**: [ADR-024](./ADR-024-importer-registry-in-tree-code-registered.md) says "auto-discovered at boot via a registry" but doesn't
specify the mechanism.

**Decision**: **Each importer package exports a manifest; the backend declares
them as deps; the registry imports manifests by package name, resolves
`implPath` lazily at run time.** `packages/importer-aws/package.json` exports
`"./manifest"` with `{name, configSchema, implPath}`. The registry has a
static list of package names (one line per importer, not a merge hotspot).
Unused importers don't load their heavy SDKs at boot (lazy `implPath`).

**Rationale**: Satisfies "auto-discovered" without runtime filesystem
fragility or a codegen step. Explicit dependency declaration. Matches how
Backstage plugins are resolved (package dependency + plugin manifest export).