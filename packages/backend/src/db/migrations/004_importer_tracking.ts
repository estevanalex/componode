import type { Kysely } from "kysely";
import { sql } from "kysely";
import { COMPONENT_CATEGORIES } from "@componode/core";

// Migrations are executed against an untyped Kysely instance. We use a local
// alias so we can issue UPDATE statements without importing the full DB type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKysely = Kysely<any>;

/**
 * Migration 004 — add importer run tracking and reconciliation columns.
 *
 * Adds:
 * - import_runs.currentPhase and cancelRequestedAt
 * - component_instances.lastSeenAt, lastSeenInRunId, and slug
 * - components.lastSeenAt and lastSeenInRunId
 * - updates the components_category_check to the ADR-013 category set.
 * - reconciles importer_configs with ADR-040 (scope is importer-specific,
 *   secretRefs is a JSONB array; the unused legacy `config` column is dropped).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // --- importer_configs (ADR-040) ---
  // The 001-foundation schema created both `config` (JSONB, not null) and
  // `scope` (JSONB, nullable). ADR-040 names the importer-specific payload
  // `scope` and `secretRefs` is a JSONB array of {key, env? | file?} objects.
  // We copy any legacy `config` value into `scope` for existing rows, then
  // drop `config` and make `scope` not null.
  await (db as AnyKysely)
    .updateTable("importer_configs")
    .set({ scope: sql`COALESCE(scope, config)` })
    .execute();

  await db.schema
    .alterTable("importer_configs")
    .dropColumn("config")
    .execute();

  await db.schema
    .alterTable("importer_configs")
    .alterColumn("scope", (col) => col.setNotNull())
    .execute();

  // --- import_runs ---
  await db.schema
    .alterTable("import_runs")
    .addColumn("currentPhase", "text")
    .execute();

  await db.schema
    .alterTable("import_runs")
    .addColumn("cancelRequestedAt", "timestamptz")
    .execute();

  // --- component_instances ---
  await db.schema
    .alterTable("component_instances")
    .addColumn("lastSeenAt", "timestamptz")
    .execute();

  await db.schema
    .alterTable("component_instances")
    .addColumn("lastSeenInRunId", "uuid", (col) =>
      col.references("import_runs.id").onDelete("set null"),
    )
    .execute();

  await db.schema
    .alterTable("component_instances")
    .addColumn("slug", "text")
    .execute();

  // Backfill slug with the row's own id (UUID v7) so the NOT NULL/UNIQUE
  // constraints can be applied safely. The importer upsert service will
  // overwrite this with a human-readable slug on the next run.
  await (db as AnyKysely)
    .updateTable("component_instances")
    .set({ slug: sql<string>`id` })
    .execute();

  await db.schema
    .alterTable("component_instances")
    .alterColumn("slug", (col) => col.setNotNull())
    .execute();

  await db.schema
    .createIndex("component_instances_slug_idx")
    .on("component_instances")
    .column("slug")
    .unique()
    .execute();

  // --- components ---
  await db.schema
    .alterTable("components")
    .addColumn("lastSeenAt", "timestamptz")
    .execute();

  await db.schema
    .alterTable("components")
    .addColumn("lastSeenInRunId", "uuid", (col) =>
      col.references("import_runs.id").onDelete("set null"),
    )
    .execute();

  // --- update components category check to ADR-013 ---
  const categoryCheck = sql`category IN (${sql.join(
    COMPONENT_CATEGORIES.map((c: string) => sql.lit(c)),
  )})`;

  await db.schema
    .alterTable("components")
    .dropConstraint("components_category_check")
    .execute();

  await db.schema
    .alterTable("components")
    .addCheckConstraint("components_category_check", categoryCheck)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Re-instate the pre-ADR-013 category list so the table can be rolled back
  // to the 001-foundation state.
  const oldCategoryCheck = sql`category IN (${sql.join(
    [
      "COMPUTE",
      "STORAGE",
      "NETWORK",
      "DATABASE",
      "MESSAGE_QUEUE",
      "CACHE",
      "CDN",
      "LOAD_BALANCER",
      "API_GATEWAY",
      "CONTAINER",
      "CONTAINER_ORCHESTRATION",
      "SERVERLESS_FUNCTION",
      "STATIC_SITE",
      "WEB_APP",
      "MOBILE_APP",
      "DESKTOP_APP",
      "CLI_TOOL",
      "SDK_LIBRARY",
      "DATA_PIPELINE",
      "ETL_JOB",
      "ANALYTICS_SERVICE",
      "MONITORING_SERVICE",
      "IDENTITY_PROVIDER",
      "OTHER",
    ].map((c: string) => sql.lit(c)),
  )})`;

  await db.schema
    .alterTable("components")
    .dropConstraint("components_category_check")
    .execute();

  await db.schema
    .alterTable("components")
    .addCheckConstraint("components_category_check", oldCategoryCheck)
    .execute();

  await db.schema
    .alterTable("components")
    .dropColumn("lastSeenInRunId")
    .execute();

  await db.schema
    .alterTable("components")
    .dropColumn("lastSeenAt")
    .execute();

  await db.schema
    .dropIndex("component_instances_slug_idx")
    .ifExists()
    .execute();

  await db.schema
    .alterTable("component_instances")
    .dropColumn("slug")
    .execute();

  await db.schema
    .alterTable("component_instances")
    .dropColumn("lastSeenInRunId")
    .execute();

  await db.schema
    .alterTable("component_instances")
    .dropColumn("lastSeenAt")
    .execute();

  await db.schema
    .alterTable("import_runs")
    .dropColumn("cancelRequestedAt")
    .execute();

  await db.schema
    .alterTable("import_runs")
    .dropColumn("currentPhase")
    .execute();

  // Restore importer_configs legacy columns
  await db.schema
    .alterTable("importer_configs")
    .alterColumn("scope", (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable("importer_configs")
    .addColumn("config", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'`))
    .execute();

  await (db as AnyKysely)
    .updateTable("importer_configs")
    .set({ config: sql`COALESCE(scope, '{}'::jsonb)` })
    .execute();
}
