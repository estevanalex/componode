### ADR-021 — Risk: deferred entirely from v1

**Context**: The prior project had `Risk` as a model-only entity with no API/UI.

**Decision**: **`Risk` deferred entirely from v1.** No Risk entity, no dashboard
count, no `/risks` link. Returns in a later phase with ASPM/security-findings
importers + scoring fields.

**Rationale**: Risk is a layer on top of assets — it's only valuable once you
have a populated asset graph, and its real value comes from automated
security-findings import, not manual entry. Shipping a manual Risk CRUD in v1
creates a feature that looks like the real thing but isn't. Build Risk in the
phase that actually consumes it.

---

## Importer Framework