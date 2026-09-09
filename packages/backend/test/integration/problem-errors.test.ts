import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import { csrfCookie, csrfHeader, loginAs, getCookie, SESSION_COOKIE_NAME } from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

async function adminSession(app: any): Promise<{ sessionCookie: string; csrf: string; csrfCookie: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    cookies: csrfCookie,
    headers: csrfHeader,
    payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });

  expect(res.statusCode).toBe(200);
  const sessionCookie = `componode_session=${getCookie(res, SESSION_COOKIE_NAME)}`;
  const csrf = csrfCookie["componode_csrf"];
  const csrfCookieValue = `componode_csrf=${csrf}`;
  return { sessionCookie, csrf, csrfCookie: csrfCookieValue };
}

describe("RFC 7807 problem responses", () => {
  let testDb: TestDb;
  let app: any;
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

  it("returns 401 as application/problem+json with auth fields", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/settings",
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.type).toBe("https://componode.io/problems/AUTH_NO_SESSION");
    expect(body.title).toBe("Authentication required");
    expect(body.status).toBe(401);
    expect(body.code).toBe("AUTH_NO_SESSION");
    expect(body.message).toBeTruthy();
  });

  it("returns 403 as application/problem+json when CSRF token is missing", async () => {
    const { sessionCookie } = await adminSession(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { username: "newuser", password: "Password123!", role: "VIEWER" },
      cookies: { [SESSION_COOKIE_NAME]: sessionCookie.split("=")[1] },
    });

    expect(res.statusCode).toBe(403);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.type).toBe("https://componode.io/problems/CSRF_TOKEN_MISMATCH");
    expect(body.status).toBe(403);
    expect(body.code).toBe("CSRF_TOKEN_MISMATCH");
  });

  it("returns 404 as application/problem+json for unknown routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/does-not-exist",
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.type).toBe("https://componode.io/problems/NOT_FOUND");
    expect(body.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 400 as application/problem+json with invalid-params for validation errors", async () => {
    const { sessionCookie, csrf } = await adminSession(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { username: "" },
      cookies: { ...csrfCookie, [SESSION_COOKIE_NAME]: sessionCookie.split("=")[1] },
      headers: { "x-csrf-token": csrf },
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.type).toBe("https://componode.io/problems/VALIDATION_FAILED");
    expect(body.status).toBe(400);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body["invalid-params"]).toBeInstanceOf(Array);
    expect(body["invalid-params"].length).toBeGreaterThan(0);
  });

  it("returns 409 as application/problem+json for duplicate username", async () => {
    const { sessionCookie, csrf } = await adminSession(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { username: ADMIN_USERNAME, password: "Password123!", role: "VIEWER" },
      cookies: { ...csrfCookie, [SESSION_COOKIE_NAME]: sessionCookie.split("=")[1] },
      headers: { "x-csrf-token": csrf },
    });

    expect(res.statusCode).toBe(409);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.type).toBe("https://componode.io/problems/AUTH_USERNAME_TAKEN");
    expect(body.status).toBe(409);
    expect(body.code).toBe("AUTH_USERNAME_TAKEN");
  });

  it("returns 429 as application/problem+json for rate-limited requests", async () => {
    const attempts = [];
    for (let i = 0; i < 30; i++) {
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
    expect(body.type).toBe("https://componode.io/problems/AUTH_RATE_LIMITED");
    expect(body.status).toBe(429);
    expect(body.code).toBe("AUTH_RATE_LIMITED");
    expect(limited.headers["content-type"]).toContain("application/problem+json");
  });

  it("does not leak stack traces in error responses", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/not-a-uuid",
    });

    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body).not.toHaveProperty("stack");
    expect(JSON.stringify(body)).not.toContain("at ");
  });
});
