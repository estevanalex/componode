### ADR-042 — Frontend importer schema delivery

**Context**: The frontend needs to render the "Add importer config" UI from
each importer's config schema.

**Decision**: **`GET /api/v1/importers` returns the manifest list (name, label,
description, configSchema as JSON Schema).** The frontend renders forms
dynamically with a shadcn-compatible renderer. One schema validates (backend)
+ renders (frontend) — no drift.

**Rationale**: Adding an importer is a backend-only change; the UI adapts
automatically. Forces importer authors to declare a proper JSON Schema, which
doubles as the backend's validation schema. A generic JSON-Schema form is
functional and consistent for v1; custom widgets are a v1.1 enhancement.