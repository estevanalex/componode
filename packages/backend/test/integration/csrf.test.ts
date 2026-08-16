import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import {
  csrfCookie,
  csrfHeader,
  loginAs,
  SESSION_COOKIE_NAME,
} from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

describe("CSRF protection", () => {
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

  it("POST without an X-CSRF-Token header → 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("CSRF_TOKEN_MISMATCH");
  });

  it("POST with a matching CSRF cookie + header succeeds", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      cookies: csrfCookie,
      headers: csrfHeader,
      payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });

    // A valid login with a valid CSRF pair should not be blocked by CSRF.
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(200);
  });

  it("POST with a mismatched CSRF cookie + header → 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      cookies: { componode_csrf: "cookie-value" },
      headers: { "x-csrf-token": "different-header-value" },
      payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("CSRF_TOKEN_MISMATCH");
  });

  it("an authenticated state-changing POST without CSRF is blocked even with a session", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      cookies: { [SESSION_COOKIE_NAME]: adminSession! }, // no csrf cookie
      // no x-csrf-token header
      payload: {
        username: "csrf-blocked",
        password: "CsrfBlocked123!",
        role: "VIEWER",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("CSRF_TOKEN_MISMATCH");
  });
});
