### ADR-070 — API versioning

> **Status:** Ratified

**Context**: The ADRs don't specify API versioning.

**Decision**: **`/api/v1/...` prefix on all routes from day one.** The
frontend API client uses a base-path constant. When v2 is needed, new routes
are added at `/api/v2/...` and v1 routes are maintained or deprecated.

**Rationale**: The cost of adding `/v1` from the start is near-zero (one
base-path constant). The cost of *not* having it and needing it later is high
(retrofit versioning across every route, frontend, and any external client).
The Composable Product Model's API is a natural candidate for external
consumption (CLI tools, CI integrations). Standard practice (GitHub, Stripe,
Kubernetes all version from v1).