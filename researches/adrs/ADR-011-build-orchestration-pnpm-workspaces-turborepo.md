### ADR-011 — Build orchestration: pnpm workspaces + Turborepo

**Context**: The monorepo will have ~10 packages (core, backend, frontend, 7
importers) with cross-dependencies.

**Decision**: **pnpm workspaces + Turborepo.** Task pipelines in `turbo.json`
(`build` depends on `^build`, `test` depends on `build`), local + remote
caching, `--filter` for affected-package runs. Importer scaffolding via a
copy-template script + ESLint boundary rules (not Nx generators).

**Rationale**: At ~10 packages with cross-deps, the no-cache tax becomes real.
Turborepo fixes that with one config file and is the de-facto standard for this
monorepo shape. Nx's generators are tempting but a copy-template script
achieves the same contributor outcome without Nx's overhead.