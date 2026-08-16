### ADR-005 — Existing assets: restructure with archive

**Context**: The prior repo carries research docs, spec-kit feature docs, and
skills that are a mix of still-valuable and now-stale.

**Decision**: **Restructure with an archive.**
- `researches/archive/` in the old repo holds superseded multi-tenant SaaS docs
  + the foundation spec.
- The Composable Product Model research and the new taxonomy research are the
  living references (copied to the new repo).
- `AGENTS.md` is rewritten for Componode (single-org, taxonomy, importer
  contract, relationship types).
- `.specify/` + `.devin/skills/` are retained (spec-kit workflow, content
  updated for Componode).

---

## Architecture & Data