import { uuidv7 } from "uuidv7";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "../db/types.js";
import { db } from "../db/connection.js";

type DbOrTrx = Kysely<DB> | Transaction<DB>;

export interface Actor {
  id: string | null;
  name: string | null;
}

export interface EntityChangeInput {
  entityType: string;
  entityId: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  importRunId?: string | null;
  actor: Actor;
}

/**
 * Append-only audit writers (FR-007). Always called inside the same
 * transaction as the domain mutation so audit can never be lost.
 */
export async function writeEntityChange(
  input: EntityChangeInput,
  trx: DbOrTrx = db,
) {
  await trx
    .insertInto("entity_changes")
    .values({
      id: uuidv7(),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      changes: input.changes,
      importRunId: input.importRunId ?? null,
      createdBy: input.actor.id,
      createdByName: input.actor.name,
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

export async function writeAuthEvent(
  action: "login" | "login_failed" | "logout" | "password_change" | "revoked" | "oidc_signin",
  identity: string | null,
  actor: Actor,
  trx: DbOrTrx = db,
) {
  await writeEntityChange(
    {
      entityType: "auth",
      entityId: null,
      action,
      changes: identity ? { identity } : null,
      actor,
    },
    trx,
  );
}

export async function writeCorrection(
  entryId: string,
  entryKind: "entity" | "edge",
  note: string,
  actor: Actor,
  trx: DbOrTrx = db,
) {
  const change = {
    corrects: entryId,
    entryKind,
    note,
  };

  if (entryKind === "edge") {
    await writeEdgeChange(
      "correction",
      { entityType: "correction", entityId: entryId },
      { entityType: "correction", entityId: entryId },
      "added",
      actor,
      JSON.stringify(change),
      trx,
    );
    return;
  }

  await writeEntityChange(
    {
      entityType: "correction",
      entityId: null,
      action: "correction",
      changes: change,
      actor,
    },
    trx,
  );
}
