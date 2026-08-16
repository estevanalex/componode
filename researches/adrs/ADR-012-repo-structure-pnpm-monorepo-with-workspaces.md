### ADR-012 — Repo structure: pnpm monorepo with workspaces

**Context**: Importers need isolation (the AWS importer pulls `@aws-sdk/*`, the
GitHub importer pulls `octokit` — they shouldn't pollute each other).

**Decision**: **pnpm monorepo with workspaces.**
- `packages/core` — shared contracts (`DiscoveredAsset`, `Component`,
  `ComponentInstance`, `DigitalProduct`, the `Importer` interface).
- `packages/backend` — Fastify API + Kysely services + scheduler.
- `packages/frontend` — React/Vite dashboard.
- `packages/importer-github`, `packages/importer-aws`, `packages/importer-azure`,
  `packages/importer-kubernetes`, `packages/importer-web-url`,
  `packages/importer-api-url`, `packages/importer-mcp-server` — one package per
  importer, each with isolated deps.

**Rationale**: Each importer is a package with its own manifest, tests, and
dependency set. The shared `DiscoveredAsset` contract in `packages/core` is the
seam that keeps importers uniform. This structure enables publishing importers
as standalone npm packages later (path to runtime-loaded plugins).

---

## Domain Model