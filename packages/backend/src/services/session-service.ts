import { db } from "../db/connection.js";

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
