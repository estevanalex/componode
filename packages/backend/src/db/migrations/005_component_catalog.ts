import type { Kysely } from "kysely";
import { sql } from "kysely";
import { COMPONENT_LIFECYCLE } from "@componode/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKysely = Kysely<any>;

/**
 * Migration 005 — extend catalog support for component groups.
 *
 * Adds:
 * - component_groups.lifecycle with a CHECK constraint.
 * - components_name_idx for efficient catalog prefix search.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("component_groups")
    .addColumn("lifecycle", "text", (col) =>
      col.notNull().defaultTo("ACTIVE"),
    )
    .execute();

  const lifecycleCheck = sql`lifecycle IN (${sql.join(
    COMPONENT_LIFECYCLE.map((l: string) => sql.lit(l)),
  )})`;

  await db.schema
    .alterTable("component_groups")
    .addCheckConstraint("component_groups_lifecycle_check", lifecycleCheck)
    .execute();

  await db.schema
    .createIndex("components_name_idx")
    .on("components")
    .column("name")
    .execute();

  await db.schema
    .createIndex("component_groups_lifecycle_idx")
    .on("component_groups")
    .column("lifecycle")
    .execute();

  // Backfill existing groups to ACTIVE so the NOT NULL default is explicit.
  await (db as AnyKysely)
    .updateTable("component_groups")
    .set({ lifecycle: "ACTIVE" })
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("component_groups_lifecycle_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("components_name_idx")
    .ifExists()
    .execute();

  await db.schema
    .alterTable("component_groups")
    .dropConstraint("component_groups_lifecycle_check")
    .execute();

  await db.schema
    .alterTable("component_groups")
    .dropColumn("lifecycle")
    .execute();
}
