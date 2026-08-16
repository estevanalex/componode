import type { FastifyInstance } from "fastify";
import { trace, context, SpanStatusCode, type Tracer as OtelTracer, type Span } from "@opentelemetry/api";

let otelTracer: OtelTracer | null = null;

try {
  otelTracer = trace.getTracer("componode-backend");
} catch {
  // OpenTelemetry not configured — tracing is a no-op
}

/**
 * Wrap a DB query in a child span (called from connection.ts or services).
 */
export function traceDbQuery<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  if (!otelTracer) return fn();
  return otelTracer.startActiveSpan(`db.${operation}`, async (span: Span) => {
    try {
      return await fn();
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
}

export async function tracingPlugin(app: FastifyInstance): Promise<void> {
  // Root span per HTTP request
  app.addHook("onRequest", async (req) => {
    if (!otelTracer) return;
    const span = otelTracer.startSpan(`${req.method} ${req.url}`);
    context.active().setValue(Symbol("requestSpan"), span);
    (req as unknown as { _span: typeof span })._span = span;
  });

  app.addHook("onResponse", async (req, reply) => {
    const span = (req as unknown as { _span?: { setAttribute: (k: string, v: unknown) => void; setStatus: (s: { code: SpanStatusCode }) => void; end: () => void } })._span;
    if (!span) return;
    span.setAttribute("http.status_code", reply.statusCode);
    if (reply.statusCode >= 500) {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  });
}
