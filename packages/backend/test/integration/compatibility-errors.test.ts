import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import { csrfCookie, csrfHeader, loginAs } from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

describe("Error response backward compatibility", () => {
  let testDb: TestDb;
  let app: any;
  let adminSession: string | undefined;
  let originalDbUrl: string | undefined;
  let originalNodeEnv: string | undefined;
  let originalBootstrapUsername: string | undefined;
  let originalBootstrapPassword: string | undefined;

  beforeAll(async () => {
    originalDbUrl = process.env.DATABASE_URL;
    originalNodeEnv = process.env.NODE_ENV;
    originalBootstrapUsername = process.env.BOOTSTRAP_ADMIN_USERNAME;
    originalBootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.NODE_ENV = "test";
    process.env.BOOTSTRAP_ADMIN_USERNAME = ADMIN_USERNAME;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = ADMIN_PASSWORD;

    const { bootstrapAdmin } = await import("../../src/services/bootstrap-service.js");
    await bootstrapAdmin();

    const { buildApp } = await import("../../src/app.js");
    app = await buildApp();
    await app.ready();

    adminSession = await loginAs(app, ADMIN_USERNAME, ADMIN_PASSWORD);
  });

  afterAll(async () => {
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
  });

  it("401 response preserves legacy code and message fields", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/settings",
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");

    const body = res.json();
    expect(body.code).toBe("AUTH_NO_SESSION");
    expect(body.message).toBeTruthy();
  });

  it("429 response preserves legacy details with retryAfter", async () => {
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(
        app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          cookies: csrfCookie,
          headers: csrfHeader,
          payload: { username: `not-a-user-${i}`, password: "wrong" },
        }),
      );
    }

    const results = await Promise.all(attempts);
    const limited = results.find((r) => r.statusCode === 429);
    expect(limited).toBeDefined();

    const body = limited.json();
    expect(body.code).toBe("AUTH_RATE_LIMITED");
    expect(body.message).toBeTruthy();
    expect(body.details).toEqual({ retryAfter: expect.any(Number) });
  });

  it("400 validation response preserves legacy fields and adds invalid-params", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      cookies: { ...csrfCookie, componode_session: adminSession },
      headers: csrfHeader,
      payload: { username: "ab" },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.message).toBeTruthy();
    expect(body.details).toBeDefined();
    expect(body["invalid-params"]).toBeInstanceOf(Array);
  });
});
