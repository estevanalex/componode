import type { DiscoveredAsset } from "./discovered-asset.js";
import type { Logger } from "../observability/logger.js";
import type { Tracer } from "../observability/tracer.js";

export interface SecretResolver {
  resolve(ref: string): Promise<string>;
}

export interface ImporterContext {
  runId: string;
  logger: Logger;
  signal: AbortSignal;
  reportPhase: (name: string) => void | Promise<void>;
  tracer?: Tracer;
}

export interface Importer {
  readonly name: string;
  readonly version: string;
  run(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    context: ImporterContext,
  ): AsyncGenerator<DiscoveredAsset>;
}
