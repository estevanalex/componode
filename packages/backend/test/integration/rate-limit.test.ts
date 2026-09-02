import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import {
  csrfCookie,
  csrfHeader,
  SESSION_COOKIE_NAME,
} from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

/**
 * NOTE (TDD): Auth-specific rate limiting (5 failed logins / 3 registrations
 * per IP) is not yet implemented — the backend currently only has a global
 * 300 req/min limit. These tests describe the intended per-endpoint behaviour
 * and are expected to fail until auth rate limiting is implemented.
 */
describe("rate limiting", () => {
  let testDb: TestDb | null = null;
  let app: any;
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

  const badLogin = (username = "admin") =>
    app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      cookies: csrfCookie,
      headers: csrfHeader,
      payload: { username, password: "WrongPassword123!" },
    });

  it("5 failed logins return 401, the 6th is rate-limited with 429 + Retry-After", async () => {
    // First 5 failures → 401
    for (let i = 0; i < 5; i++) {
      const res = await badLogin();
      expect(res.statusCode).toBe(401);
    }

    // 6th attempt → 429 AUTH_RATE_LIMITED
    const res = await badLogin();
    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.code).toBe("AUTH_RATE_LIMITED");
    // Retry-After should be present (header or in details)
    const retryAfter = res.headers["retry-after"];
    expect(retryAfter).toBeDefined();
  });

  it("4th registration from the same IP is rate-limited with 429", async () => {
    // The registration endpoint allows at most 3 sign-ups per IP per window.
    // (Uses the public registration flow; here we exercise POST /api/v1/users
    // from an unauthenticated client which would be the self-registration path.)
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        cookies: csrfCookie,
        headers: csrfHeader,
        payload: {
          username: `reguser-${i}`,
          password: "RegUser123!",
        },
      });
    }

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      cookies: csrfCookie,
      headers: csrfHeader,
      payload: {
        username: "reguser-4",
        password: "RegUser123!",
      },
    });

    expect(res.statusCode).toBe(429);
    expect(res.json().code).toBe("AUTH_RATE_LIMITED");
  });
});
