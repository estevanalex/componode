import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import {
  createPersonInDb,
  createSessionInDb,
  csrfCookie,
  csrfHeader,
  loginAs,
  SESSION_COOKIE_NAME,
} from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

describe("sessions", () => {
  let testDb: TestDb | null = null;
  let app: any;
  let adminSession: string | undefined;
  let originalDbUrl: string | undefined;
  let originalNodeEnv: string | undefined;
  let originalBootstrapUsername: string | undefined;
  let originalBootstrapPassword: string | undefined;

  beforeEach(async () => {
    originalDbUrl = process.env.DATABASE_URL;
    originalNodeEnv = process.env.NODE_ENV;
    originalBootstrapUsername = process.env.BOOTSTRAP_ADMIN_USERNAME;
    originalBootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.NODE_ENV = "test";
    process.env.BOOTSTRAP_ADMIN_USERNAME = ADMIN_USERNAME;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = ADMIN_PASSWORD;
    vi.resetModules();

    const { bootstrapAdmin } = await import("../../src/services/bootstrap-service.js");
    await bootstrapAdmin();

    const { buildApp } = await import("../../src/app.js");
    app = await buildApp();
    await app.ready();

    adminSession = await loginAs(app, ADMIN_USERNAME, ADMIN_PASSWORD);
  });

  afterEach(async () => {
    if (app) await app.close();
    if (testDb) await testDb.cleanup();
    if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
    else delete process.env.DATABASE_URL;
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
    if (originalBootstrapUsername !== undefined) process.env.BOOTSTRAP_ADMIN_USERNAME = originalBootstrapUsername;
    else delete process.env.BOOTSTRAP_ADMIN_USERNAME;
    if (originalBootstrapPassword !== undefined) process.env.BOOTSTRAP_ADMIN_PASSWORD = originalBootstrapPassword;
    else delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    vi.resetModules();
  });

  it("session persists across multiple requests", async () => {
    // First request with the session
    const res1 = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { [SESSION_COOKIE_NAME]: adminSession! },
    });
    expect(res1.statusCode).toBe(200);

    // Second request with the same session should still work
    const res2 = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { [SESSION_COOKIE_NAME]: adminSession! },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().user.username).toBe(ADMIN_USERNAME);
  });

  it("logout revokes the session so the next request is 401", async () => {
    // Logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
    });
    expect(logoutRes.statusCode).toBe(204);

    // Re-using the same session token should now be rejected
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { [SESSION_COOKIE_NAME]: adminSession! },
    });
    expect(res.statusCode).toBe(401);
  });

  it("admin lists a user's sessions via GET /api/v1/users/:id/sessions → 200", async () => {
    // Create a separate user with a session directly in the DB
    const userId = await createPersonInDb(testDb!.db, { username: "sessioned-user" });
    const sessionId = await createSessionInDb(testDb!.db, userId);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/users/${userId}/sessions`,
      cookies: { [SESSION_COOKIE_NAME]: adminSession! },
    });

    expect(res.statusCode).toBe(200);
    const sessions = res.json().sessions;
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.some((s: { id: string }) => s.id === sessionId)).toBe(true);
  });

  it("admin revokes a session via POST /api/v1/sessions/:id/revoke → 204", async () => {
    const userId = await createPersonInDb(testDb!.db, { username: "revokable-user" });
    const sessionId = await createSessionInDb(testDb!.db, userId);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/revoke`,
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
    });
    expect(res.statusCode).toBe(204);

    // A request using the revoked session token should now be 401
    const authRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { [SESSION_COOKIE_NAME]: sessionId },
    });
    expect(authRes.statusCode).toBe(401);
  });
});
