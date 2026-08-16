import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/connection.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", {
    preHandler: [app.verifySession],
  }, async (_req: FastifyRequest, reply: FastifyReply) => {
    let databaseStatus = "connected";
    try {
      await db.selectFrom("persons").select("persons.id").limit(1).execute();
    } catch {
      databaseStatus = "disconnected";
    }

    const status = databaseStatus === "connected" ? "healthy" : "unhealthy";
    const statusCode = databaseStatus === "connected" ? 200 : 503;

    return reply.status(statusCode).send({
      status,
      database: databaseStatus,
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? "1.0.0",
    });
  });
}
