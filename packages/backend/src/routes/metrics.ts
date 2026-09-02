import type { FastifyInstance } from "fastify";
import { promClient } from "../plugins/metrics.js";

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  // Unauthenticated metrics endpoint (ADR-069)
  // Network-policy-restricted in production (Docker Compose internal network)
  app.get("/metrics", async (_req, reply) => {
    const metrics = await promClient.register.metrics();
    reply.type("text/plain; version=0.0.4").send(metrics);
  });
}
