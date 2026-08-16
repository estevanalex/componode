### ADR-015 — Product→Component dependency: logical, env-agnostic

**Context**: The product hierarchy depends on components. The question is
whether the dependency is on the logical component or the env-specific instance.

**Decision**: **`DigitalProduct DEPENDS_ON Component`** (logical, env-agnostic)
for v1. Per-env blast-radius (product depends on specific instance) is
documented as a Phase 4+ evolution.

**Rationale**: "Checkout depends on payments-api" is the stable,
judgment-bearing statement; "and here are payments-api's instances across
dev/staging/prod" is a navigation, not a separate dependency. Matches LeanIX
(Application → IT Component) and Backstage (Component → Resource).