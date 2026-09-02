import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Creates append-only triggers on audit tables (ADR-100).
 * BEFORE UPDATE OR DELETE triggers raise an exception unconditionally
 * on entity_changes, edge_changes, and import_run_errors.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // entity_changes — append-only
  await sql`
    CREATE OR REPLACE FUNCTION prevent_entity_changes_modification()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'entity_changes is append-only (ADR-100)';
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    CREATE TRIGGER no_modify_entity_changes
    BEFORE UPDATE OR DELETE ON entity_changes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_entity_changes_modification();
  `.execute(db);

  // edge_changes — append-only
  await sql`
    CREATE OR REPLACE FUNCTION prevent_edge_changes_modification()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'edge_changes is append-only (ADR-100)';
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    CREATE TRIGGER no_modify_edge_changes
    BEFORE UPDATE OR DELETE ON edge_changes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_edge_changes_modification();
  `.execute(db);

  // import_run_errors — append-only
  await sql`
    CREATE OR REPLACE FUNCTION prevent_import_run_errors_modification()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'import_run_errors is append-only (ADR-100)';
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    CREATE TRIGGER no_modify_import_run_errors
    BEFORE UPDATE OR DELETE ON import_run_errors
    FOR EACH ROW
    EXECUTE FUNCTION prevent_import_run_errors_modification();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS no_modify_entity_changes ON entity_changes`.execute(db);
  await sql`DROP FUNCTION IF EXISTS prevent_entity_changes_modification`.execute(db);
  await sql`DROP TRIGGER IF EXISTS no_modify_edge_changes ON edge_changes`.execute(db);
  await sql`DROP FUNCTION IF EXISTS prevent_edge_changes_modification`.execute(db);
  await sql`DROP TRIGGER IF EXISTS no_modify_import_run_errors ON import_run_errors`.execute(db);
  await sql`DROP FUNCTION IF EXISTS prevent_import_run_errors_modification`.execute(db);
}
