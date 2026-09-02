import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Creates a terminal-state trigger on import_runs (ADR-100).
 * BEFORE UPDATE trigger raises if OLD.status is terminal
 * (COMPLETED, FAILED, CANCELLED, or INTERRUPTED).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION prevent_import_runs_terminal_modification()
    RETURNS trigger AS $$
    BEGIN
      IF OLD.status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'INTERRUPTED') THEN
        RAISE EXCEPTION 'Cannot modify import_runs in terminal state (ADR-100): %', OLD.status;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    CREATE TRIGGER no_modify_terminal_import_runs
    BEFORE UPDATE ON import_runs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_import_runs_terminal_modification();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS no_modify_terminal_import_runs ON import_runs`.execute(db);
  await sql`DROP FUNCTION IF EXISTS prevent_import_runs_terminal_modification`.execute(db);
}
