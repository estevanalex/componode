import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { loginSchema, registerSchema, passwordChangeSchema, passwordResetConfirmSchema } from "@componode/core";
import { login, logout } from "../services/auth-service.js";
import { generatePasswordReset, confirmPasswordReset } from "../services/password-reset-service.js";
import { initiateLogin, handleCallback, isOidcEnabled } from "../services/oidc-service.js";
import { hashPassword, verifyPassword } from "../utils/argon2.js";
import { db } from "../db/connection.js";
import { createSession } from "../services/session-service.js";
import { uuidv7 } from "uuidv7";
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
  app.post("/auth/login", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
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

  // POST /auth/register — public self-registration (only if allowSelfRegistration is enabled)
  app.post("/auth/register", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    // Check if self-registration is enabled
    const settingsRow = await db
      .selectFrom("app_settings")
      .select("app_settings.value")
      .where("app_settings.key", "=", "allow_self_registration")
      .executeTakeFirst();

    const allowSelfRegistration = settingsRow?.value === true;
    if (!allowSelfRegistration) {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Self-registration is not enabled" });
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        details: parsed.error.issues,
      });
    }

    // Check username uniqueness
    const existing = await db
      .selectFrom("persons")
      .select("persons.id")
      .where("persons.username", "=", parsed.data.username)
      .executeTakeFirst();

    if (existing) {
      return reply.status(409).send({ code: "AUTH_USERNAME_TAKEN", message: "Username already taken" });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date().toISOString();
    const id = uuidv7();
    const slug = parsed.data.username.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    await db
      .insertInto("persons")
      .values({
        id,
        username: parsed.data.username,
        passwordHash,
        role: "VIEWER",
        displayName: parsed.data.displayName ?? null,
        slug,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    // Auto-login: create session
    const sessionToken = await createSession(id);
    reply.setCookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
    const csrfToken = (reply as unknown as { setCsrfCookie: () => string }).setCsrfCookie();

    const user = await db
      .selectFrom("persons")
      .select(["persons.id", "persons.username", "persons.role", "persons.displayName"])
      .where("persons.id", "=", id)
      .executeTakeFirst();

    return reply.status(201).send({ user, csrfToken });
  });

  // GET /auth/oidc/status — public endpoint for login page to check if OIDC is enabled
  app.get("/auth/oidc/status", async (_req: FastifyRequest, reply: FastifyReply) => {
    const enabled = await isOidcEnabled();
    return reply.status(200).send({ enabled });
  });

  // POST /auth/oidc/login — initiate OIDC login, redirect to IdP
  app.post("/auth/oidc/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { redirect_uri?: string };
    try {
      const redirectUrl = await initiateLogin(query.redirect_uri ?? "/");
      return reply.status(302).redirect(redirectUrl);
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      if (error.statusCode === 503) {
        return reply.status(503).send({ code: "OIDC_NOT_CONFIGURED", message: "OIDC is not configured" });
      }
      throw err;
    }
  });

  // GET /auth/oidc/callback — OIDC callback, exchange code, create session, redirect
  app.get("/auth/oidc/callback", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    
    if (query.error) {
      return reply.status(302).redirect(`/login?error=oidc_${query.error}`);
    }

    if (!query.code || !query.state) {
      return reply.status(400).send({ code: "OIDC_INVALID_CODE", message: "Missing code or state parameter" });
    }

    try {
      const { sessionToken, redirectUri } = await handleCallback(query.code, query.state);
      reply.setCookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
      const csrfToken = (reply as unknown as { setCsrfCookie: () => string }).setCsrfCookie();
      // Pass CSRF token as query param for the frontend to store (since this is a redirect, not JSON)
      return reply.status(302).redirect(`${redirectUri}?csrf=${csrfToken}`);
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      const status = error.statusCode ?? 400;
      const code = error.code ?? "OIDC_INVALID_CODE";
      const message = error.message ?? "OIDC callback failed";
      if (status === 302) {
        return reply.status(302).redirect(`/login?error=${code.toLowerCase()}`);
      }
      return reply.status(status).send({ code, message });
    }
  });
}
