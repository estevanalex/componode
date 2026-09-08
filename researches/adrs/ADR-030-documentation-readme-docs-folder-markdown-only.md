### ADR-030 — Documentation: README + docs/ folder, Markdown only

> **Status:** Ratified, amended by constitution v1.0.2 (2026-09-08)

**Context**: For an OSS project, docs are the product.

**Decision**: **README + `docs/` folder as Markdown sources; a generated docs
site is built from these sources in feature `007-deployment-cicd-docs`.** The
generated site does not introduce new documentation content; it publishes the
existing Markdown and OpenAPI reference. Priority source docs:
- `docs/importer-development.md` — the contributor contract (`Importer`
  interface, `DiscoveredAsset` shape, `SecretResolver` pattern, reference-
  importer walkthrough, test harness usage).
- `docs/data-model.md` — schema, entities, relationships.
- `docs/deployment.md` — Docker Compose self-hosting.

**Amendment (v1.0.2)**: A generated docs site (VitePress) is included in v1 as
part of `007-deployment-cicd-docs` and was removed from the v1.1 roadmap.

**Rationale**: v1's doc audience is contributors and self-hosters, both served
well by Markdown in the repo. GitHub's own Markdown rendering + repo search is
enough. Feature `007` adds a navigable generated site on top of the same
Markdown sources without changing the authoring format or duplicating content.