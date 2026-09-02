import { z } from "zod";
import type { DiscoveredAsset } from "../contracts/discovered-asset.js";

const discoveredAssetEnvironmentSchema = z.object({
  environment: z.enum(["DEV", "TEST", "STAGING", "DEMO", "PRODUCTION", "OTHER"]),
  url: z.string().url().nullable().optional(),
  region: z.string().nullable().optional(),
  status: z.enum(["RUNNING", "STOPPED", "ERROR", "GONE"]).nullable().optional(),
  version: z.string().nullable().optional(),
  externalId: z.string().min(1),
  rawConfig: z.record(z.string(), z.unknown()).nullable().optional(),
});

const discoveredAssetSchema = z.object({
  category: z.enum([
    "COMPUTE", "STORAGE", "NETWORK", "DATABASE", "MESSAGE_QUEUE", "CACHE",
    "CDN", "LOAD_BALANCER", "API_GATEWAY", "CONTAINER", "CONTAINER_ORCHESTRATION",
    "SERVERLESS_FUNCTION", "STATIC_SITE", "WEB_APP", "MOBILE_APP", "DESKTOP_APP",
    "CLI_TOOL", "SDK_LIBRARY", "DATA_PIPELINE", "ETL_JOB", "ANALYTICS_SERVICE",
    "MONITORING_SERVICE", "IDENTITY_PROVIDER", "OTHER",
  ]),
  provider: z.enum([
    "GITHUB", "AWS", "AZURE", "GOOGLE_CLOUD", "KUBERNETES", "DOCKER",
    "WEB", "API", "MCP", "OTHER",
  ]),
  resourceType: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  externalId: z.string().min(1),
  environments: z.array(discoveredAssetEnvironmentSchema),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
});

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateDiscoveredAsset(asset: unknown): asset is DiscoveredAsset {
  return discoveredAssetSchema.safeParse(asset).success;
}

export function validateDiscoveredAssetDetailed(asset: unknown): ValidationResult {
  const result = discoveredAssetSchema.safeParse(asset);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}
