import type { ComponentCategory, ComponentProvider, Environment, InstanceStatus } from "../constants/index.js";

export interface DiscoveredAssetEnvironment {
  environment: Environment;
  url?: string | null;
  region?: string | null;
  status?: InstanceStatus | null;
  version?: string | null;
  externalId: string;
  rawConfig?: Record<string, unknown> | null;
}

export interface DiscoveredAsset {
  category: ComponentCategory;
  provider: ComponentProvider;
  resourceType: string;
  name: string;
  externalId: string;
  environments: DiscoveredAssetEnvironment[];
  details?: Record<string, unknown> | null;
  // NOTE: relationships[] is NOT part of v1 contract (ADR-030, Constitution Principle V)
  // Importer-declared product edges are v2. Component-to-component edges (DEPENDS_ON,
  // SOURCES_FROM, EXPOSES) are reserved for v2 per ADR-030.
}
