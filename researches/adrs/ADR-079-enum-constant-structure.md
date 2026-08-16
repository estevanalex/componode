### ADR-079 — Enum constant structure

**Context**: [ADR-078](./ADR-078-database-migrations.md) has enum values as `core` constants. What is their
structure?

**Decision**: **`const` arrays + union types for enum values + separate
`*_META` maps for labels/descriptions.** `core` exports
`COMPONENT_CATEGORIES = ["COMPUTE", ...] as const` + `type ComponentCategory
= typeof COMPONENT_CATEGORIES[number]` + `COMPONENT_CATEGORY_META: Record<
ComponentCategory, {label, description}>`. Backend imports values only;
frontend imports both (values + metadata for UI labels).

**Rationale**: Clean separation of the enum (for validation/DB) from display
metadata (for UI). "Add a category" (update array + migration) is distinct
from "rename a category's display label" (update metadata map, no migration).
TS `enum` declarations are avoided (tree-shaking issues, ecosystem moving
away). The metadata map is where future i18n hooks in.