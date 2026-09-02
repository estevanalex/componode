import type { DiscoveredAsset } from "./discovered-asset.js";
import type { Logger } from "../observability/logger.js";
import type { Tracer } from "../observability/tracer.js";

export interface SecretResolver {
  resolve(ref: string): Promise<string>;
}

export interface ImporterContext {
  logger: Logger;
  tracer?: Tracer;
  secretResolver: SecretResolver;
}

export interface Importer {
  readonly name: string;
  readonly version: string;
  run(config: Record<string, unknown>, context: ImporterContext): AsyncGenerator<DiscoveredAsset>;
}
