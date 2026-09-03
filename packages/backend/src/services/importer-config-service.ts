import { uuidv7 } from "uuidv7";
import { z } from "zod";
import type { CreateImporterConfigInput, UpdateImporterConfigInput } from "@componode/core";
import { db } from "../db/connection.js";
import { getManifest } from "./importer-registry.js";
import * as cron from "node-cron";
import { scheduleConfig, rescheduleConfig, unscheduleConfig } from "./scheduler-service.js";

function assertValidSchedule(schedule: string | null | undefined): void {
  if (!schedule) return;
  if (!cron.validate(schedule)) {
    throw Object.assign(new Error("Invalid cron expression"), {
      statusCode: 400,
      code: "VALIDATION_FAILED",
    });
  }
}

async function validateScopeForImporter(
  importerName: string,
  scope: Record<string, unknown>,
): Promise<void> {
  const manifest = await getManifest(importerName);
  const schema = manifest.configSchema as z.ZodTypeAny | undefined;
  if (!schema || typeof schema.safeParse !== "function") {
    return;
  }

  const result = schema.safeParse(scope);
  if (!result.success) {
    throw Object.assign(new Error("Scope validation failed"), {
      statusCode: 400,
      code: "VALIDATION_FAILED",
      details: result.error.issues,
    });
  }
}

export async function listImporterConfigs() {
  return db
    .selectFrom("importer_configs")
    .select([
      "id",
      "importerName",
      "label",
      "scope",
      "secretRefs",
      "schedule",
      "enabled",
      "createdAt",
      "updatedAt",
    ])
    .orderBy("createdAt", "desc")
    .execute();
}

export async function getImporterConfig(id: string) {
  return db
    .selectFrom("importer_configs")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function createImporterConfig(
  input: CreateImporterConfigInput,
  createdBy: string | null,
) {
  await validateScopeForImporter(input.importerName, input.scope);
  assertValidSchedule(input.schedule);

  const id = uuidv7();
  const now = new Date().toISOString();
  await db
    .insertInto("importer_configs")
    .values({
      id,
      importerName: input.importerName,
      label: input.label,
      scope: input.scope,
      // The `secretRefs` column is `jsonb`; node-postgres serialises JS arrays as
      // Postgres array literals ({}), which `jsonb` parses as an empty object.
      // Stringify the JSON array so Postgres stores it as a JSON array instead.
      secretRefs: JSON.stringify(input.secretRefs ?? []) as unknown as Array<{
        key: string;
        env?: string;
        file?: string;
      }>,
      schedule: input.schedule ?? null,
      enabled: input.enabled,
      createdBy,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  await scheduleConfig({ id, schedule: input.schedule ?? null, enabled: input.enabled });
  return getImporterConfig(id);
}

export async function updateImporterConfig(
  id: string,
  input: UpdateImporterConfigInput,
  updatedBy: string | null,
) {
  const existing = await getImporterConfig(id);
  if (!existing) {
    return null;
  }

  const importerName = input.importerName ?? existing.importerName;
  const scope = input.scope ?? existing.scope;
  await validateScopeForImporter(importerName, scope);
  assertValidSchedule(input.schedule ?? existing.schedule);

  const updates: Record<string, unknown> = {};
  if (input.importerName !== undefined) updates.importerName = input.importerName;
  if (input.label !== undefined) updates.label = input.label;
  if (input.scope !== undefined) updates.scope = input.scope;
  if (input.secretRefs !== undefined) {
    updates.secretRefs = JSON.stringify(input.secretRefs) as unknown as Array<{
      key: string;
      env?: string;
      file?: string;
    }>;
  }
  if (input.schedule !== undefined) updates.schedule = input.schedule;
  if (input.enabled !== undefined) updates.enabled = input.enabled;

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  updates.updatedBy = updatedBy;
  updates.updatedAt = new Date().toISOString();

  await db
    .updateTable("importer_configs")
    .set(updates)
    .where("id", "=", id)
    .execute();

  const updated = await getImporterConfig(id);
  if (updated) {
    await rescheduleConfig({ id: updated.id, schedule: updated.schedule, enabled: updated.enabled });
  }
  return updated;
}

export async function deleteImporterConfig(id: string) {
  const existing = await getImporterConfig(id);
  if (!existing) {
    return null;
  }

  await db
    .deleteFrom("importer_configs")
    .where("id", "=", id)
    .execute();

  unscheduleConfig(id);
  return existing;
}
