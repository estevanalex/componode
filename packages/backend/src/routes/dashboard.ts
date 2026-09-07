import type { FastifyInstance, FastifyReply } from "fastify";
import { getDashboardSummary } from "../services/dashboard-service.js";

/**
 * GET /api/v1/dashboard/summary — read-only aggregates for the
 * health-and-attention dashboard (spec 004 / contracts/api.md).
 * Side-effect-free GET (ADR-094); authenticated (ADR-054/097).
 */
export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/dashboard/summary",
    { preHandler: [app.verifySession] },
    async (_req, reply: FastifyReply) => {
      const summary = await getDashboardSummary();
      return reply.status(200).send(summary);
    },
  );
}
