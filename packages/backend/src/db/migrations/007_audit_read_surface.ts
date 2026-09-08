import type { Kysely } from "kysely";

/**
 * Migration 007 — extend the audit surface for reading and attribution.
 *
 * - `entity_changes.entityId` becomes nullable so auth/security events with
 *   no associated entity can be recorded.
 * - `entity_changes.importRunId` is added to attribute importer-driven
 *   transitions to the run that produced them.
 * - Indexes are added to keep the activity feed and per-run/entity history
 *   responsive as the audit tables grow.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("entity_changes")
    .alterColumn("entityId", (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable("entity_changes")
    .addColumn("importRunId", "uuid", (col) =>
      col.references("import_runs.id").onDelete("set null"),
    )
    .execute();

  await db.schema
    .createIndex("entity_changes_created_at_idx")
    .on("entity_changes")
    .column("createdAt")
    .execute();

  await db.schema
    .createIndex("entity_changes_entity_idx")
    .on("entity_changes")
    .columns(["entityType", "entityId"])
    .execute();

  await db.schema
    .createIndex("entity_changes_import_run_idx")
    .on("entity_changes")
    .column("importRunId")
    .execute();

  await db.schema
    .createIndex("edge_changes_created_at_idx")
    .on("edge_changes")
    .column("createdAt")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("edge_changes_created_at_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("entity_changes_import_run_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("entity_changes_entity_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("entity_changes_created_at_idx")
    .ifExists()
    .execute();

  await db.schema
    .alterTable("entity_changes")
    .dropColumn("importRunId")
    .execute();

  await db.schema
    .alterTable("entity_changes")
    .alterColumn("entityId", (col) => col.setNotNull())
    .execute();
}
