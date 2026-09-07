import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { listUserSessions, revokeSession } from "../services/session-service.js";
import { requireRole } from "../plugins/rbac.js";
import type { AuthenticatedRequest } from "../plugins/session.js";

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // GET /sessions — list current user's sessions
  app.get("/sessions", {
    preHandler: [app.verifySession],
  }, async (req: AuthenticatedRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Not authenticated" });
    }
    const sessions = await listUserSessions(req.user.id);
    return reply.status(200).send({ sessions });
  });

  // POST /sessions/:id/revoke — revoke a session
  app.post("/sessions/:id/revoke", {
    preHandler: [app.verifySession],
  }, async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    if (!req.user) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Not authenticated" });
    }

    // Users can revoke their own sessions; admins can revoke any.
    // :id is the session's non-secret publicId (UUID), not the token.

    await revokeSession(id);
    return reply.status(204).send();
  });

  // GET /users/:id/sessions — admin only, list a user's sessions
  app.get("/users/:id/sessions", {
    preHandler: [app.verifySession, requireRole("user:listSessions")],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const sessions = await listUserSessions(id);
    return reply.status(200).send({ sessions });
  });
}
