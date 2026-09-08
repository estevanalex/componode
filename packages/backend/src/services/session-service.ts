import { db } from "../db/connection.js";
import { generateSessionToken } from "../utils/crypto.js";
import { uuidv7 } from "uuidv7";
import { getSetting } from "./settings-service.js";
import { writeAuthEvent, type Actor } from "./audit-service.js";

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const now = new Date();
  const absoluteTimeoutMs = Number(await getSetting("sessionAbsoluteTimeoutMs"));
  const expiresAt = new Date(now.getTime() + absoluteTimeoutMs);

  await db
    .insertInto("sessions")
    .values({
      id: sessionToken,
      publicId: uuidv7(),
      userId,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    .execute();

  return sessionToken;
}

/**
 * Revoke a session by its non-secret publicId (never by the token — the
 * token is a credential and is not exposed to clients).
 */
export async function revokeSession(publicId: string, actor: Actor): Promise<void> {
  const session = await db
    .selectFrom("sessions")
    .select(["id", "userId"])
    .where("sessions.publicId", "=", publicId)
    .executeTakeFirst();

  const now = new Date().toISOString();
  await db
    .updateTable("sessions")
    .set({ revokedAt: now })
    .where("sessions.publicId", "=", publicId)
    .execute();

  if (session) {
    await writeAuthEvent("revoked", null, { id: session.userId, name: actor.name ?? actor.id });
  }
}

export async function revokeUserSessions(userId: string, actor: Actor): Promise<void> {
  const now = new Date().toISOString();
  await db
    .updateTable("sessions")
    .set({ revokedAt: now })
    .where("sessions.userId", "=", userId)
    .where("sessions.revokedAt", "is", null)
    .execute();

  await writeAuthEvent("revoked", null, { id: userId, name: actor.name ?? actor.id });
}

/**
 * List active sessions for a user. Returns the non-secret `publicId` as `id`
 * plus the last 4 characters of the token for display (001-foundation
 * contract: session tokens are never returned by the API).
 */
export async function listUserSessions(userId: string) {
  const rows = await db
    .selectFrom("sessions")
    .select([
      "sessions.publicId",
      "sessions.id",
      "sessions.createdAt",
      "sessions.lastSeenAt",
      "sessions.expiresAt",
    ])
    .where("sessions.userId", "=", userId)
    .where("sessions.revokedAt", "is", null)
    .orderBy("sessions.createdAt", "desc")
    .execute();

  return rows.map((row) => ({
    id: row.publicId,
    tokenLast4: row.id.slice(-4),
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    expiresAt: row.expiresAt,
  }));
}
