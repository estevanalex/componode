import type { FastifyInstance } from "fastify";
import promClient from "prom-client";

const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const authEventsTotal = new promClient.Counter({
  name: "auth_events_total",
  help: "Authentication events",
  labelNames: ["event", "outcome"] as const,
});

const dbPoolSize = new promClient.Gauge({
  name: "db_pool_size",
  help: "Database connection pool size",
});

const dbPoolAvailable = new promClient.Gauge({
  name: "db_pool_available",
  help: "Available database connections",
});

const dbQueryDurationSeconds = new promClient.Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration",
  labelNames: ["operation"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

const rateLimitEventsTotal = new promClient.Counter({
  name: "rate_limit_events_total",
  help: "Rate limit events",
  labelNames: ["endpoint"] as const,
});

// Collect default Node.js metrics (event loop, GC, memory, CPU)
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

export const metrics = {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  authEventsTotal,
  dbPoolSize,
  dbPoolAvailable,
  dbQueryDurationSeconds,
  rateLimitEventsTotal,
};

export async function metricsPlugin(app: FastifyInstance): Promise<void> {
  // Instrument HTTP request duration and count
  app.addHook("onResponse", async (req, reply) => {
    const route = req.routeOptions?.url ?? req.url;
    const method = req.method;
    const status = String(reply.statusCode);
    const duration = reply.elapsedTime / 1000;

    httpRequestsTotal.inc({ method, route, status });
    httpRequestDurationSeconds.observe({ method, route }, duration);
  });
}

export { promClient };
