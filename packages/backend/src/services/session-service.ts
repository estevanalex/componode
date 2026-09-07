import { db } from "../db/connection.js";
import { generateSessionToken } from "../utils/crypto.js";
import { uuidv7 } from "uuidv7";

const ABSOLUTE_TIMEOUT_MS = parseInt(
  process.env.SESSION_ABSOLUTE_TIMEOUT_MS ?? "43200000",
  10,
); // 12h default

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

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
export async function revokeSession(publicId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .updateTable("sessions")
    .set({ revokedAt: now })
    .where("sessions.publicId", "=", publicId)
    .execute();
}

export async function revokeUserSessions(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .updateTable("sessions")
    .set({ revokedAt: now })
    .where("sessions.userId", "=", userId)
    .where("sessions.revokedAt", "is", null)
    .execute();
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
