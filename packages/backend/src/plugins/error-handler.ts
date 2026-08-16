import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from "fastify";

const debugErrorDetails = process.env.DEBUG_ERROR_DETAILS === "true";

export async function errorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err, url: request.url, method: request.method }, "Request error");

    // Validation errors (from Zod or Fastify schema validation)
    if (err.validation) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: err.validation,
      });
    }

    // Rate limit errors
    if (err.statusCode === 429) {
      return reply.status(429).send({
        code: "AUTH_RATE_LIMITED",
        message: "Too many requests. Please try again later.",
      });
    }

    // Auth errors
    if (err.statusCode === 401) {
      return reply.status(401).send({
        code: err.code ?? "AUTH_NO_SESSION",
        message: err.message || "Authentication required",
      });
    }

    if (err.statusCode === 403) {
      return reply.status(403).send({
        code: "AUTH_FORBIDDEN",
        message: err.message || "Insufficient permissions",
      });
    }

    if (err.statusCode === 404) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: err.message || "Resource not found",
      });
    }

    if (err.statusCode === 409) {
      return reply.status(409).send({
        code: err.code ?? "CONFLICT",
        message: err.message || "Conflict",
      });
    }

    // Internal errors — never leak details
    const response: { code: string; message: string; details?: unknown } = {
      code: "INTERNAL_ERROR",
      message: "An internal error occurred",
    };

    if (debugErrorDetails) {
      response.details = {
        error: err.message,
        stack: err.stack,
      };
    }

    return reply.status(500).send(response);
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}
