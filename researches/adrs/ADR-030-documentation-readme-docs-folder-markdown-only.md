### ADR-030 — Documentation: README + docs/ folder, Markdown only

> **Status:** Ratified

**Context**: For an OSS project, docs are the product.

**Decision**: **README + `docs/` folder, Markdown only.** Priority docs:
- `docs/importer-development.md` — the contributor contract (`Importer`
  interface, `DiscoveredAsset` shape, `SecretResolver` pattern, reference-
  importer walkthrough, test harness usage).
- `docs/data-model.md` — schema, entities, relationships.
- `docs/deployment.md` — Docker Compose self-hosting.

Generated docs site (Docusaurus/VitePress/Starlight) is post-v1.

**Rationale**: v1's doc audience is contributors and self-hosters, both served
well by Markdown in the repo. GitHub's own Markdown rendering + repo search is
enough. Migrating to a docs site later is a one-day job (content stays, you add
a config + nav).