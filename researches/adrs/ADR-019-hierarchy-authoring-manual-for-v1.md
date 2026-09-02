### ADR-019 — Hierarchy authoring: manual for v1

> **Status:** Ratified

**Context**: Importers populate components; the product hierarchy is the
high-value, high-judgment layer.

**Decision**: **Manual only for v1.** Importers populate the factual layer
(components, instances, environments); humans curate the meaning layer
(products, composition). The `relationships?` field on `DiscoveredAsset` is
reserved for future importer-declared candidate edges (v2: staged as
candidates, human-confirmed).

**Rationale**: "Does the Payments product compose the Fraud product, or consume
from it?" is a business/architecture decision, not something a GitHub importer
can reliably infer. v1 keeps the importer contract clean.