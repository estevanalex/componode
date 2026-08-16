import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import {
  csrfCookie,
  csrfHeader,
  loginAs,
  createPersonInDb,
  createSessionInDb,
  SESSION_COOKIE_NAME,
} from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

describe("settings CRUD", () => {
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

  it("admin GET /api/v1/settings → 200 + settings object", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/settings",
      cookies: { [SESSION_COOKIE_NAME]: adminSession! },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.settings).toBeDefined();
    expect(body.settings.allowSelfRegistration).toBe(false);
    expect(body.settings.sessionIdleTimeoutMs).toBe(1440000);
    expect(body.settings.sessionAbsoluteTimeoutMs).toBe(43200000);
    expect(body.settings.defaultUserRole).toBe("VIEWER");
  });

  it("admin PATCH /api/v1/settings → 200 + updated settings", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/settings",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: {
        allowSelfRegistration: true,
        sessionIdleTimeoutMs: 7200000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.settings.allowSelfRegistration).toBe(true);
    expect(body.settings.sessionIdleTimeoutMs).toBe(7200000);
  });

  it("non-admin GET /api/v1/settings → 403", async () => {
    const viewerId = await createPersonInDb(testDb!.db, {
      username: "viewer",
      passwordHash: "$argon2id$dummy",
      role: "VIEWER",
    });
    const viewerSession = await createSessionInDb(testDb!.db, viewerId);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/settings",
      cookies: { [SESSION_COOKIE_NAME]: viewerSession },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("AUTH_FORBIDDEN");
  });

  it("admin GET /api/v1/settings/oidc → 200 + default oidc config", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession! },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.oidcConfig).toBeDefined();
    expect(body.oidcConfig.enabled).toBe(false);
  });

  it("admin PUT /api/v1/settings/oidc with disabled config → 200", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: {
        enabled: false,
        issuer: null,
        clientId: null,
        clientSecretRef: null,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.oidcConfig.enabled).toBe(false);
  });

  it("admin PUT /api/v1/settings/oidc with enabled=true but empty issuer → 422 OIDC_DISCOVERY_FAILED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: {
        enabled: true,
        issuer: "http://localhost:1/nonexistent-oidc",
        clientId: "test-client",
        clientSecretRef: "env:OIDC_CLIENT_SECRET",
      },
    });

    // Discovery fails against the bogus issuer → 422
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe("OIDC_DISCOVERY_FAILED");
  });

  it("admin PATCH /api/v1/settings with invalid timeout < 60000 → 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/settings",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: {
        sessionIdleTimeoutMs: 30000,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("VALIDATION_FAILED");
  });
});
