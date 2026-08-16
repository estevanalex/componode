### ADR-020 — Ownership: LineOfBusiness + Team + Person

**Context**: The Composable Product Model has `OWNS` relationships. The
prior project had LOB as a seed-only fixture.

**Decision**: **`LineOfBusiness` + `Team` + `Person`, all manageable entities.**
- `LineOfBusiness OWNS DigitalProduct` (top of hierarchy)
- `Team OWNS DigitalProduct` / `Component` (day-to-day accountability)
- `Person BELONGS_TO Team`

**Rationale**: Full ownership graph matches the Composable Model and LeanIX.
The Platform Product workflow's owner assignment can target a Team or an LOB.