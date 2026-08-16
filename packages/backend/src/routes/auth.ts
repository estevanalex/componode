import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { loginSchema, passwordChangeSchema, passwordResetConfirmSchema } from "@componode/core";
import { login, logout } from "../services/auth-service.js";
import { generatePasswordReset, confirmPasswordReset } from "../services/password-reset-service.js";
import { hashPassword, verifyPassword } from "../utils/argon2.js";
import { db } from "../db/connection.js";
import { requireRole } from "../plugins/rbac.js";
import { SESSION_COOKIE_NAME, type AuthenticatedRequest } from "../plugins/session.js";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// Type augmentation for the verifySession decorator
declare module "fastify" {
  interface FastifyInstance {
    verifySession: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/login
  app.post("/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        details: parsed.error.issues,
      });
    }

    const { user, sessionToken } = await login(parsed.data.username, parsed.data.password);

    reply.setCookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
    // Set CSRF cookie (double-submit pattern)
    const csrfToken = (reply as unknown as { setCsrfCookie: () => string }).setCsrfCookie();

    return reply.status(200).send({
      user,
      csrfToken,
    });
  });

  // POST /auth/logout
  app.post("/auth/logout", async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionToken) {
      await logout(sessionToken);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    reply.clearCookie("componode_csrf", { path: "/" });
    return reply.status(204).send();
  });

  // GET /auth/session
  app.get("/auth/session", {
    preHandler: [app.verifySession],
  }, async (req: AuthenticatedRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      user: req.user,
    });
  });

  // POST /auth/password/change — all authenticated users
  app.post("/auth/password/change", {
    preHandler: [app.verifySession],
  }, async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const parsed = passwordChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        details: parsed.error.issues,
      });
    }

    if (!req.user) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Not authenticated" });
    }

    // Load current password hash
    const person = await db
      .selectFrom("persons")
      .select(["persons.id", "persons.passwordHash"])
      .where("persons.id", "=", req.user.id)
      .executeTakeFirst();

    if (!person || !person.passwordHash) {
      return reply.status(401).send({ code: "AUTH_INVALID_CREDENTIALS", message: "No password set" });
    }

    const valid = await verifyPassword(parsed.data.currentPassword, person.passwordHash);
    if (!valid) {
      return reply.status(401).send({ code: "AUTH_INVALID_CREDENTIALS", message: "Current password is incorrect" });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await db
      .updateTable("persons")
      .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
      .where("persons.id", "=", req.user.id)
      .execute();

    return reply.status(204).send();
  });

  // POST /auth/password/reset — admin only, generates reset token
  app.post("/auth/password/reset", {
    preHandler: [app.verifySession, requireRole("password:reset:generate")],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { userId?: string };
    if (!body?.userId) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", message: "userId is required" });
    }

    const token = await generatePasswordReset(body.userId);
    return reply.status(200).send({ token });
  });

  // POST /auth/password/reset/confirm — public (uses token, no session needed)
  app.post("/auth/password/reset/confirm", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        details: parsed.error.issues,
      });
    }

    try {
      await confirmPasswordReset(parsed.data.token, parsed.data.newPassword);
      return reply.status(204).send();
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      if (error.statusCode === 400) {
        return reply.status(400).send({
          code: error.code ?? "AUTH_RESET_TOKEN_INVALID",
          message: error.message ?? "Invalid reset token",
        });
      }
      throw err;
    }
  });
}
