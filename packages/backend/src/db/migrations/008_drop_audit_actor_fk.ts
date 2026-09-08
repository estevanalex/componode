import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Migration 008 — drop foreign-key constraints from audit table `createdBy`
 * columns to `persons.id`.
 *
 * Audit rows are append-only and must survive hard-deletion of the actor who
 * created them. The actor's display name is already snapshotted in
 * `createdByName`; `createdBy` may remain as a stale UUID or be set to NULL
 * without triggering the append-only modification guard.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DO $$
    DECLARE conname text;
    BEGIN
      FOR conname IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'entity_changes'
          AND f.relname = 'persons'
          AND a.attname = 'createdBy'
      LOOP
        EXECUTE format('ALTER TABLE entity_changes DROP CONSTRAINT IF EXISTS %I', conname);
      END LOOP;
    END $$;
  `.execute(db);

  await sql`
    DO $$
    DECLARE conname text;
    BEGIN
      FOR conname IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'edge_changes'
          AND f.relname = 'persons'
          AND a.attname = 'createdBy'
      LOOP
        EXECUTE format('ALTER TABLE edge_changes DROP CONSTRAINT IF EXISTS %I', conname);
      END LOOP;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE edge_changes
    ADD CONSTRAINT edge_changes_createdBy_fkey
    FOREIGN KEY ("createdBy") REFERENCES persons(id) ON DELETE SET NULL
  `.execute(db);

  await sql`
    ALTER TABLE entity_changes
    ADD CONSTRAINT entity_changes_createdBy_fkey
    FOREIGN KEY ("createdBy") REFERENCES persons(id) ON DELETE SET NULL
  `.execute(db);
}
