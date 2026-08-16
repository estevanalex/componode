### ADR-057 — DiscoveredAsset final shape (supersedes ADR-025)

**Context**: [ADR-025](./ADR-025-importer-interface-pull-only-asyncgenerator.md) defined `DiscoveredAsset` with `instances?` and
`relationships?` (reserved for v2). Q2–Q4 refined instance reconciliation.

**Decision**: **Final `DiscoveredAsset` shape:**

```typescript
interface DiscoveredAsset {
  category: ComponentCategory;
  provider: ComponentProvider;
  externalId: string;
  name: string;
  resourceType?: string;
  slug?: string;                     // importer-suggested ([ADR-046](./ADR-046-slug-generation-and-uniqueness.md): core may suffix)
  details?: Record<string, unknown>;
  instances?: ComponentInstanceData[];
  // relationships[] removed from v1 contract ([ADR-019](./ADR-019-hierarchy-authoring-manual-for-v1.md): manual hierarchy for v1)
}

interface ComponentInstanceData {
  externalId: string;                // required ([ADR-034](./ADR-034-componentinstance-upsert-key.md): upsert key)
  environment: ComponentEnvironment; // required ([ADR-014](./ADR-014-environment-separate-componentinstance-entity.md) enum)
  url?: string;
  region?: string;
  status?: ComponentInstanceStatus;  // optional (importer may not know)
  version?: string;
  deployedAt?: Date;
  rawConfig?: Record<string, unknown>;
}
```

**Rationale**: `relationships[]` removed entirely from v1 (not just reserved)
— adding importer-declared edges would expand the contract surface for a v2
feature. `slug?` added as importer-suggested ([ADR-046](./ADR-046-slug-generation-and-uniqueness.md)). `ComponentInstanceData.
externalId` required ([ADR-034](./ADR-034-componentinstance-upsert-key.md)). `environment` required (prevents null-env
pollution). `status` optional (importer may not know operational state).