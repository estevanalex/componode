### ADR-046 — Slug generation and uniqueness

> **Status:** Ratified

**Context**: AGENTS.md mandates `slug` on `DigitalProduct`, `Component`,
`ComponentInstance` but doesn't define generation or collision handling.

**Decision**: **Hybrid by entity type.** `DigitalProduct`: user-owned manual
slug, validated, collision-rejected with "choose another." `Component`/
`ComponentInstance`: importer-derived slug (from `name`/`externalId`), silent
suffix-collision (`-2`, `-3`). DB unique constraint enforced either way.

**Rationale**: Matches the curation asymmetry ([ADR-019](./ADR-019-hierarchy-authoring-manual-for-v1.md)): products are
low-volume, high-curation (manual slugs); components are high-volume,
importer-driven (auto-generation). Editing an importer-managed slug creates
churn (the importer re-derives it next run).