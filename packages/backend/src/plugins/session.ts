import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/connection.js";

const SESSION_COOKIE_NAME = "componode_session";
const IDLE_TIMEOUT_MS = parseInt(process.env.SESSION_IDLE_TIMEOUT_MS ?? "1440000", 10); // 4h default
const LAST_SEEN_UPDATE_INTERVAL_MS = 60_000; // Throttle lastSeenAt updates to once per 60s

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    username: string;
    role: string;
    displayName: string | null;
  };
  sessionId?: string;
}

export async function sessionPlugin(app: FastifyInstance): Promise<void> {
  // Session verification preHandler — applied to protected routes
  app.decorate("verifySession", async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "No session cookie" });
    }

    const session = await db
      .selectFrom("sessions")
      .select([
        "sessions.id",
        "sessions.userId",
        "sessions.createdAt",
        "sessions.lastSeenAt",
        "sessions.expiresAt",
        "sessions.revokedAt",
      ])
      .where("sessions.id", "=", sessionToken)
      .executeTakeFirst();

    if (!session) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Session not found" });
    }

    if (session.revokedAt !== null) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Session revoked" });
    }

    const now = new Date();

    if (new Date(session.expiresAt) < now) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Session expired" });
    }

    // Idle timeout check
    const lastSeen = new Date(session.lastSeenAt);
    const idleMs = now.getTime() - lastSeen.getTime();
    if (idleMs > IDLE_TIMEOUT_MS) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Session idle timeout" });
    }

    // Load user
    const user = await db
      .selectFrom("persons")
      .select([
        "persons.id",
        "persons.username",
        "persons.role",
        "persons.displayName",
        "persons.isActive",
      ])
      .where("persons.id", "=", session.userId)
      .executeTakeFirst();

    if (!user || !user.isActive) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "User not found or inactive" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    };
    req.sessionId = sessionToken;

    // Throttled lastSeenAt update
    if (idleMs > LAST_SEEN_UPDATE_INTERVAL_MS) {
      await db
        .updateTable("sessions")
        .set({ lastSeenAt: now.toISOString() })
        .where("sessions.id", "=", sessionToken)
        .execute();
    }
  });
}

export { SESSION_COOKIE_NAME };
