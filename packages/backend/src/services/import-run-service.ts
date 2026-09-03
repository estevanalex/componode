import { uuidv7 } from "uuidv7";
import PQueue from "p-queue";
import {
  NOOP_TRACER,
  validateDiscoveredAssetDetailed,
  type DiscoveredAsset,
  type ImportRun,
  type Logger,
} from "@componode/core";
import { db } from "../db/connection.js";
import { logger as appLogger } from "../plugins/logging.js";
import { getImporter } from "./importer-registry.js";
import { resolveSecrets } from "../utils/secret-resolver.js";
import { generateUniqueSlug, generateComponentSlug, generateInstanceSlug } from "../utils/slug.js";
import { metrics } from "../plugins/metrics.js";
import { traceDbQuery } from "../plugins/tracing.js";
import type { Kysely } from "kysely";
import type { DB } from "../db/types.js";

const maxConcurrency = parseInt(process.env.IMPORTER_MAX_CONCURRENCY ?? "3", 10);
if (isNaN(maxConcurrency) || maxConcurrency < 1) {
  throw new Error("Invalid IMPORTER_MAX_CONCURRENCY");
}

const queue = new PQueue({ concurrency: maxConcurrency });
const runningControllers = new Map<string, AbortController>();

function createRunLogger(runId: string): Logger {
  const child = appLogger.child({ runId });
  return {
    debug: (msg, data) => child.debug(data ?? {}, msg),
    info: (msg, data) => child.info(data ?? {}, msg),
    warn: (msg, data) => child.warn(data ?? {}, msg),
    error: (msg, data) => child.error(data ?? {}, msg),
    child: (bindings) => createRunLogger(`${runId}:${JSON.stringify(bindings)}`),
  };
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return true;
  if (err instanceof Error && err.message === "AbortError") return true;
  if (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "AbortError") {
    return true;
  }
  return false;
}

async function updateRun(
  runId: string,
  updates: Partial<ImportRun> & Record<string, unknown>,
): Promise<void> {
  await db.updateTable("import_runs").set(updates).where("id", "=", runId).execute();
}

async function insertRunError(
  runId: string,
  assetExternalId: string | null,
  errorType: string,
  errorMessage: string,
  errorStack?: string | null,
): Promise<void> {
  await db
    .insertInto("import_run_errors")
    .values({
      id: uuidv7(),
      runId,
      assetExternalId,
      errorType,
      errorMessage,
      errorStack: errorStack ?? null,
      createdAt: new Date().toISOString(),
    })
    .execute();
}

async function ensureUniqueComponentSlug(
  trx: Kysely<DB>,
  base: string,
): Promise<string> {
  return generateUniqueSlug(base, async (slug) => {
    const existing = await trx
      .selectFrom("components")
      .select("components.id")
      .where("components.slug", "=", slug)
      .executeTakeFirst();
    return existing !== undefined;
  });
}

async function ensureUniqueInstanceSlug(
  trx: Kysely<DB>,
  base: string,
  componentId: string,
): Promise<string> {
  return generateUniqueSlug(base, async (slug) => {
    const existing = await trx
      .selectFrom("component_instances")
      .select("component_instances.id")
      .where("component_instances.componentId", "=", componentId)
      .where("component_instances.slug", "=", slug)
      .executeTakeFirst();
    return existing !== undefined;
  });
}

async function processAsset(
  trx: Kysely<DB>,
  runId: string,
  asset: DiscoveredAsset,
  triggeredBy: string | null,
): Promise<{ componentId: string; created: boolean; instancesOrphaned: number }> {
  const now = new Date().toISOString();

  const component = await trx
    .selectFrom("components")
    .selectAll()
    .where("category", "=", asset.category)
    .where("provider", "=", asset.provider)
    .where("externalId", "=", asset.externalId)
    .executeTakeFirst();

  let componentId: string;
  let componentSlug: string;
  let created: boolean;

  if (component) {
    componentId = component.id;
    componentSlug = component.slug;
    created = false;
    await trx
      .updateTable("components")
      .set({
        name: asset.name,
        resourceType: asset.resourceType,
        details: asset.details ?? null,
        lifecycle: "ACTIVE",
        lastSeenAt: now,
        lastSeenInRunId: runId,
        updatedAt: now,
      })
      .where("id", "=", componentId)
      .execute();
  } else {
    componentId = uuidv7();
    const baseSlug = asset.slug ?? generateComponentSlug(asset.name, asset.externalId);
    componentSlug = await ensureUniqueComponentSlug(trx, baseSlug);
    await trx
      .insertInto("components")
      .values({
        id: componentId,
        name: asset.name,
        slug: componentSlug,
        category: asset.category,
        provider: asset.provider,
        resourceType: asset.resourceType,
        lifecycle: "ACTIVE",
        externalId: asset.externalId,
        details: asset.details ?? null,
        lastSeenAt: now,
        lastSeenInRunId: runId,
        createdBy: triggeredBy,
        updatedBy: triggeredBy,
        createdAt: now,
        updatedAt: now,
      })
      .execute();
    created = true;
  }

  for (const instance of asset.instances) {
    const baseInstanceSlug = generateInstanceSlug(componentSlug, instance.environment, instance.externalId);
    const instanceSlug = await ensureUniqueInstanceSlug(trx, baseInstanceSlug, componentId);

    const existingInstance = await trx
      .selectFrom("component_instances")
      .select("id")
      .where("componentId", "=", componentId)
      .where("externalId", "=", instance.externalId)
      .executeTakeFirst();

    const instanceValues = {
      environment: instance.environment,
      url: instance.url ?? null,
      region: instance.region ?? null,
      status: instance.status ?? "RUNNING",
      version: instance.version ?? null,
      deployedAt: instance.deployedAt ?? null,
      rawConfig: instance.rawConfig ?? null,
      slug: instanceSlug,
      lastSeenAt: now,
      lastSeenInRunId: runId,
      updatedAt: now,
    };

    if (existingInstance) {
      await trx
        .updateTable("component_instances")
        .set(instanceValues)
        .where("id", "=", existingInstance.id)
        .execute();
    } else {
      await trx
        .insertInto("component_instances")
        .values({
          id: uuidv7(),
          componentId,
          externalId: instance.externalId,
          ...instanceValues,
          createdBy: triggeredBy,
          createdAt: now,
        })
        .execute();
    }
  }

  // Phase 1 reconciliation: orphan instances for this component not seen this run
  const orphanResult = await trx
    .updateTable("component_instances")
    .set({ status: "GONE", updatedAt: now })
    .where("componentId", "=", componentId)
    .where("lastSeenInRunId", "!=", runId)
    .executeTakeFirst();

  const instancesOrphaned = Number(orphanResult.numUpdatedRows ?? 0);

  return { componentId, created, instancesOrphaned };
}

async function reconcileRetiredComponents(
  configId: string,
  yieldedComponentIds: Set<string>,
): Promise<number> {
  if (yieldedComponentIds.size === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  const result = await db
    .updateTable("components")
    .set({ lifecycle: "RETIRED", updatedAt: now })
    .where("lifecycle", "=", "ACTIVE")
    .where(
      "lastSeenInRunId",
      "in",
      (eb) => eb.selectFrom("import_runs").select("id").where("configId", "=", configId),
    )
    .where("id", "not in", Array.from(yieldedComponentIds))
    .executeTakeFirst();

  await db
    .updateTable("component_instances")
    .set({ status: "GONE", updatedAt: now })
    .where("status", "!=", "GONE")
    .where("componentId", "in", (eb) =>
      eb
        .selectFrom("components")
        .select("components.id")
        .where("lifecycle", "=", "RETIRED")
        .where(
          "lastSeenInRunId",
          "in",
          (eb2) => eb2.selectFrom("import_runs").select("id").where("configId", "=", configId),
        )
        .where("id", "not in", Array.from(yieldedComponentIds)),
    )
    .execute();

  return Number(result.numUpdatedRows ?? 0);
}

async function worker(runId: string): Promise<void> {
  const controller = new AbortController();
  runningControllers.set(runId, controller);

  let terminalStatus: "COMPLETED" | "FAILED" | "CANCELLED" = "FAILED";
  let importerName: string | undefined;
  let startTime = Date.now();

  try {
    const run = await db
      .selectFrom("import_runs")
      .selectAll()
      .where("id", "=", runId)
      .executeTakeFirst();

    if (!run) {
      return;
    }

    if (run.status !== "PENDING") {
      return;
    }

    if (run.cancelRequestedAt) {
      terminalStatus = "CANCELLED";
      await updateRun(runId, {
        status: terminalStatus,
        completedAt: new Date().toISOString(),
        currentPhase: "Cancelled before start",
      });
      return;
    }

    const config = await db
      .selectFrom("importer_configs")
      .selectAll()
      .where("id", "=", run.configId)
      .executeTakeFirst();

    if (!config) {
      throw Object.assign(new Error("Importer config not found"), {
        code: "CONFIG_NOT_FOUND",
      });
    }

    importerName = config.importerName;
    startTime = Date.now();

    const now = new Date().toISOString();
    await updateRun(runId, {
      status: "RUNNING",
      startedAt: now,
      currentPhase: "Initializing",
    });

    const secrets = await resolveSecrets(config.secretRefs);
    const importer = await getImporter(config.importerName);

    const reportPhase = async (name: string) => {
      if (controller.signal.aborted) return;
      await updateRun(runId, { currentPhase: name });
    };

    const context = {
      runId,
      logger: createRunLogger(runId),
      signal: controller.signal,
      reportPhase,
      tracer: NOOP_TRACER,
    };

    const yieldedComponentIds = new Set<string>();
    let assetsProcessed = 0;
    let assetsCreated = 0;
    let assetsUpdated = 0;
    let instancesOrphaned = 0;
    let componentsRetired = 0;

    for await (const asset of importer.run(config.scope as Record<string, unknown>, secrets, context)) {
      if (controller.signal.aborted) {
        throw Object.assign(new Error("AbortError"), { name: "AbortError" });
      }

      const validation = validateDiscoveredAssetDetailed(asset);
      if (!validation.valid) {
        await insertRunError(runId, asset.externalId, "VALIDATION_FAILED", validation.errors?.join("; ") ?? "Validation failed");
        metrics.importRunErrorsTotal.inc({ importer: importerName, errorType: "VALIDATION_FAILED" });
        assetsProcessed++;
        await updateRun(runId, { assetsProcessed });
        continue;
      }

      const result = await traceDbQuery("processAsset", () =>
        db.transaction().execute(async (trx) => processAsset(trx, runId, asset, run.triggeredBy)),
      );

      yieldedComponentIds.add(result.componentId);
      assetsProcessed++;
      assetsCreated += result.created ? 1 : 0;
      assetsUpdated += result.created ? 0 : 1;
      instancesOrphaned += result.instancesOrphaned;

      metrics.importRunAssetsYieldedTotal.inc({ importer: importerName });

      await updateRun(runId, {
        assetsProcessed,
        assetsCreated,
        assetsUpdated,
        instancesOrphaned,
      });
    }

    const cancelCheck = await db
      .selectFrom("import_runs")
      .select("cancelRequestedAt")
      .where("id", "=", runId)
      .executeTakeFirst();

    if (controller.signal.aborted || cancelCheck?.cancelRequestedAt) {
      terminalStatus = "CANCELLED";
      await updateRun(runId, {
        status: terminalStatus,
        completedAt: new Date().toISOString(),
        currentPhase: "Cancelled",
      });
      return;
    }

    const now2 = new Date().toISOString();
    componentsRetired = await reconcileRetiredComponents(config.id, yieldedComponentIds);

    terminalStatus = "COMPLETED";
    await updateRun(runId, {
      status: terminalStatus,
      completedAt: now2,
      currentPhase: "Completed",
      assetsProcessed,
      assetsCreated,
      assetsUpdated,
      instancesOrphaned,
      componentsRetired,
    });
  } catch (err) {
    if (isAbortError(err)) {
      terminalStatus = "CANCELLED";
      await updateRun(runId, {
        status: terminalStatus,
        completedAt: new Date().toISOString(),
        currentPhase: "Cancelled",
      });
      return;
    }

    const error = err instanceof Error ? err : new Error(String(err));
    const debug = process.env.DEBUG_ERROR_DETAILS === "true";
    terminalStatus = "FAILED";
    const errorType = (error as { code?: string }).code ?? "RUNTIME_ERROR";
    await updateRun(runId, {
      status: terminalStatus,
      completedAt: new Date().toISOString(),
      currentPhase: "Failed",
      errorMessage: error.message,
      errorType,
      errorStack: debug ? error.stack ?? null : null,
    });

    if (importerName) {
      metrics.importRunErrorsTotal.inc({ importer: importerName, errorType });
    }
  } finally {
    runningControllers.delete(runId);

    if (importerName) {
      const durationSeconds = (Date.now() - startTime) / 1000;
      metrics.importRunDurationSeconds.observe({ importer: importerName }, durationSeconds);
      metrics.importRunsTotal.inc({ importer: importerName, status: terminalStatus });
    }
  }
}

export async function startRun(
  configId: string,
  triggeredBy: string | null,
): Promise<{ runId: string }> {
  const runId = uuidv7();
  const now = new Date().toISOString();

  await db
    .transaction()
    .execute(async (trx) => {
      const existing = await trx
        .selectFrom("import_runs")
        .select("id")
        .where("configId", "=", configId)
        .where("status", "in", ["PENDING", "RUNNING"])
        .forUpdate()
        .executeTakeFirst();

      if (existing) {
        throw Object.assign(new Error("An import run is already in progress for this config"), {
          statusCode: 409,
          code: "RUN_IN_PROGRESS",
        });
      }

      await trx
        .insertInto("import_runs")
        .values({
          id: runId,
          configId,
          status: "PENDING",
          triggeredBy,
          assetsProcessed: 0,
          assetsCreated: 0,
          assetsUpdated: 0,
          instancesOrphaned: 0,
          componentsRetired: 0,
          createdAt: now,
        })
        .execute();
    });

  queue.add(() => worker(runId));

  return { runId };
}

export async function cancelRun(runId: string): Promise<void> {
  const now = new Date().toISOString();

  await db
    .updateTable("import_runs")
    .set({ cancelRequestedAt: now })
    .where("id", "=", runId)
    .execute();

  const controller = runningControllers.get(runId);
  if (controller) {
    controller.abort();
  }
}

export async function getRun(runId: string) {
  return db.selectFrom("import_runs").selectAll().where("id", "=", runId).executeTakeFirst();
}

export async function listRunsForConfig(configId: string) {
  return db
    .selectFrom("import_runs")
    .selectAll()
    .where("configId", "=", configId)
    .orderBy("createdAt", "desc")
    .execute();
}

export async function listRunErrors(runId: string) {
  return db
    .selectFrom("import_run_errors")
    .selectAll()
    .where("runId", "=", runId)
    .orderBy("createdAt", "desc")
    .execute();
}
