import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export async function corsPlugin(app: FastifyInstance): Promise<void> {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS;

  if (!allowedOrigins) {
    // CORS disabled by default (ADR-088)
    return;
  }

  const origins = allowedOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return;
  }

  await app.register(cors, {
    origin: origins, // exact match only — no wildcards
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });
}
