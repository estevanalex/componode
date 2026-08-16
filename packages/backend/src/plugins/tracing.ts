import type { FastifyInstance } from "fastify";
import { trace, context, SpanStatusCode, type Tracer as OtelTracer } from "@opentelemetry/api";

let otelTracer: OtelTracer | null = null;

try {
  otelTracer = trace.getTracer("componode-backend");
} catch {
  // OpenTelemetry not configured — tracing is a no-op
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
