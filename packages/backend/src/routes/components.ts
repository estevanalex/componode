import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { listComponentsQuerySchema, updateComponentGroupAssignmentSchema } from "@componode/core";
import type { AuthenticatedRequest } from "../plugins/session.js";
import { requireRole } from "../plugins/rbac.js";
import { listComponents, getComponentById } from "../services/component-catalog-service.js";
import { assignComponentGroup } from "../services/component-group-service.js";

export async function componentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/components/:id", {
    preHandler: [app.verifySession],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const component = await getComponentById(id);
    if (!component) {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Component not found" });
    }
    return reply.status(200).send({ component });
  });

  app.patch("/components/:id", {
    preHandler: [app.verifySession, requireRole("component:update")],
  }, async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const parsed = updateComponentGroupAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        details: parsed.error.issues,
      });
    }

    try {
      const result = await assignComponentGroup(id, parsed.data);
      return reply.status(200).send({ component: result });
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      if (error.statusCode === 404) {
        return reply.status(404).send({ code: error.code ?? "NOT_FOUND", message: error.message ?? "Not found" });
      }
      throw err;
    }
  });

  app.get("/components", {
    preHandler: [app.verifySession],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = listComponentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Invalid query parameters",
        details: parsed.error.issues,
      });
    }

    const result = await listComponents(parsed.data);
    return reply.status(200).send(result);
  });
}
