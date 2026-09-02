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

/**
 * NOTE (TDD): The OIDC login/callback service is not yet fully implemented.
 * These tests describe the intended behaviour and are expected to fail until
 * the OIDC routes (`/auth/oidc/login`, `/auth/oidc/callback`) and JIT
 * provisioning are implemented.
 */
describe("OIDC", () => {
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

  it("admin configures OIDC via PUT /api/v1/settings/oidc → 200", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: {
        enabled: true,
        issuer: "https://idp.example.com",
        clientId: "componode-client",
        clientSecretRef: "oidc/clientSecret",
        roleClaimPath: "groups",
        claimValueField: "name",
        roleMapping: { "componode-admins": "ADMIN" },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.oidcConfig.enabled).toBe(true);
    expect(body.oidcConfig.issuer).toBe("https://idp.example.com");
  });

  it("initiates OIDC login via POST /auth/oidc/login → 302 redirect", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/oidc/login",
    });

    expect(res.statusCode).toBe(302);
    const location = res.headers["location"];
    expect(typeof location).toBe("string");
    expect(location as string).toMatch(/https?:\/\//);
  });

  it("callback with a mock code+state returns 302 and sets a session cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/oidc/callback?code=mock-code&state=mock-state",
    });

    expect(res.statusCode).toBe(302);
    const setCookie = res.headers["set-cookie"];
    const headerStr = Array.isArray(setCookie) ? setCookie.join("\n") : String(setCookie ?? "");
    expect(headerStr).toContain(SESSION_COOKIE_NAME);
  });

  it("JIT-provisions a new oidcSubject as a Viewer user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/oidc/callback?code=mock-code-new-user&state=mock-state",
    });
    expect(res.statusCode).toBe(302);

    // After a successful callback for a brand-new oidcSubject, a person row
    // with role VIEWER should exist.
    const persons = await testDb!.db
      .selectFrom("persons")
      .select(["persons.id", "persons.oidcSubject", "persons.role"])
      .where("persons.oidcSubject", "is not", null)
      .execute();
    const jitUser = persons.find((p) => p.oidcSubject !== null);
    expect(jitUser).toBeDefined();
    expect(jitUser!.role).toBe("VIEWER");
  });

  it("callback with invalid state → 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/oidc/callback?code=mock-code&state=bad-state",
    });
    expect(res.statusCode).toBe(400);
  });

  it("OIDC login when disabled → 503", async () => {
    // Disable OIDC first
    await app.inject({
      method: "PUT",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: { enabled: false },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/oidc/login",
    });
    expect(res.statusCode).toBe(503);
  });

  it("callback with an invalid code → 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/oidc/callback?code=invalid-code&state=mock-state",
    });
    expect(res.statusCode).toBe(400);
  });
});
