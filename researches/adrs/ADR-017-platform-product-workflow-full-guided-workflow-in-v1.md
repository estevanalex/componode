### ADR-017 — Platform Product workflow: full guided workflow in v1

> **Status:** Ratified

**Context**: The Composable Product Model's core value is governing shared
infrastructure via platform products.

**Decision**: **Full guided workflow in v1:**
1. **Detection**: UI surfaces components depended-on by multiple products
   ("Kafka-cluster-X is depended on by 4 business products — consider making
   it a platform product").
2. **Promotion action**: User clicks "Create platform product from this
   component" → creates a `DigitalProduct` (type: PLATFORM), wires
   `DEPENDS_ON` from the platform product to the component, rewrites existing
   `DEPENDS_ON` edges from consuming business products into `CONSUMES_FROM`
   edges pointing at the new platform product.
3. **Ownership assignment**: Workflow prompts for an owner (Team or LOB) for
   the new platform product.

**Rationale**: Half a workflow (detect but don't promote, or promote but don't
rewrite) is frustrating. The edge-rewrite is a bounded transaction (N edges
out, N+1 edges in). This feature most directly demonstrates the Composable
Product Model's value — "watch shared infrastructure become governed."