import type { Kysely } from "kysely";
import { sql } from "kysely";

// Migrations are executed against an untyped Kysely instance (see 004).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKysely = Kysely<any>;

/**
 * Migration 006 — add a non-secret public identifier to sessions.
 *
 * `sessions.id` is the bearer token itself (a 32-byte random credential).
 * Listing it via `GET /sessions` or `GET /users/:id/sessions` leaks live
 * session tokens to any client that can read the response (001-foundation
 * contract required masking). `publicId` is a UUID v7-style identifier safe
 * to expose; `POST /sessions/:id/revoke` resolves it to the real token
 * server-side.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sessions")
    .addColumn("publicId", "uuid")
    .execute();

  // Backfill existing rows, then enforce NOT NULL + UNIQUE.
  await (db as AnyKysely)
    .updateTable("sessions")
    .set({ publicId: sql`gen_random_uuid()` })
    .execute();

  await db.schema
    .alterTable("sessions")
    .alterColumn("publicId", (col) => col.setNotNull())
    .execute();

  await db.schema
    .createIndex("sessions_public_id_idx")
    .on("sessions")
    .column("publicId")
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("sessions_public_id_idx")
    .ifExists()
    .execute();

  await db.schema
    .alterTable("sessions")
    .dropColumn("publicId")
    .execute();
}
