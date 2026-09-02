### ADR-025 — Importer interface: pull-only AsyncGenerator

> **Status:** Superseded by [ADR-056](./ADR-056-importer-interface-signature.md) (signature) and [ADR-057](./ADR-057-discoveredasset-final-shape.md) (asset shape).

**Context**: The importer contract must be uniform for the ecosystem to work.

**Decision**: **Pull-only sync.** `Importer.run(config, secretResolver):
AsyncGenerator<DiscoveredAsset>` — the importer pulls from the source, yields
normalized asset records, and the core persists them (upsert by
`(category, provider, externalId)`). The importer never touches the DB.

**`DiscoveredAsset` shape**:
```typescript
{
  category: ComponentCategory;
  provider: ComponentProvider;
  externalId: string;          // stable source-native ID for dedup
  name: string;
  resourceType?: string;       // provider-native type
  details?: Record<string, unknown>;  // source-specific JSONB
  instances?: ComponentInstanceData[];  // env-specific deployments
  relationships?: Array<{      // reserved for v2 candidate edges
    targetExternalId: string;
    type: 'DEPENDS_ON' | 'SOURCES_FROM' | 'EXPOSES';
  }>;
}
```

**Rationale**: The importer is a pure async generator. The core owns upsert,
dedup, `import_runs` history, and component/instance lifecycle. A contributor
writing a GCP importer never imports Kysely, never writes SQL, never thinks
about transactions — they implement one function that yields assets. That's
the difference between "we have a plugin ecosystem" and "we have a folder of
incompatible scripts."