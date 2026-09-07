import { uuidv7 } from "uuidv7";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "../db/types.js";
import { db } from "../db/connection.js";

type DbOrTrx = Kysely<DB> | Transaction<DB>;

export interface Actor {
  id: string | null;
  name: string | null;
}

/**
 * Append-only audit writers (spec 005, FR-007). Always called inside the same
 * transaction as the domain mutation so audit can never be lost.
 */
export async function writeEntityChange(
  entityType: string,
  entityId: string,
  action: string,
  changes: Record<string, unknown> | null,
  actor: Actor,
  trx: DbOrTrx = db,
) {
  await trx
    .insertInto("entity_changes")
    .values({
      id: uuidv7(),
      entityType,
      entityId,
      action,
      changes,
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: new Date().toISOString(),
    })
    .execute();
}

export async function writeEdgeChange(
  edgeType: string,
  from: { entityType: string; entityId: string },
  to: { entityType: string; entityId: string },
  action: "added" | "removed",
  actor: Actor,
  reason: string | null = null,
  trx: DbOrTrx = db,
) {
  await trx
    .insertInto("edge_changes")
    .values({
      id: uuidv7(),
      edgeType,
      fromEntityType: from.entityType,
      fromEntityId: from.entityId,
      toEntityType: to.entityType,
      toEntityId: to.entityId,
      action,
      reason,
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: new Date().toISOString(),
    })
    .execute();
}
