import { db } from "../db/connection.js";
import { generateSessionToken } from "../utils/crypto.js";

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
      userId,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    .execute();

  return sessionToken;
}

export async function revokeSession(sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .updateTable("sessions")
    .set({ revokedAt: now })
    .where("sessions.id", "=", sessionId)
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

export async function listUserSessions(userId: string) {
  return db
    .selectFrom("sessions")
    .select([
      "sessions.id",
      "sessions.createdAt",
      "sessions.lastSeenAt",
      "sessions.expiresAt",
    ])
    .where("sessions.userId", "=", userId)
    .where("sessions.revokedAt", "is", null)
    .orderBy("sessions.createdAt", "desc")
    .execute();
}
