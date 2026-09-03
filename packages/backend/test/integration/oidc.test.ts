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
const ISSUER = "https://idp.example.com";

function makeIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.`;
}

function discoveryResponse() {
  return new Response(
    JSON.stringify({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function tokenResponse(claims: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      id_token: makeIdToken(claims),
      access_token: "mock-access-token",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("OIDC", () => {
  let testDb: TestDb | null = null;
  let app: any;
  let adminSession: string | undefined;
  let originalDbUrl: string | undefined;
  let originalNodeEnv: string | undefined;
  let originalBootstrapUsername: string | undefined;
  let originalBootstrapPassword: string | undefined;
  let originalClientSecret: string | undefined;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    originalDbUrl = process.env.DATABASE_URL;
    originalNodeEnv = process.env.NODE_ENV;
    originalBootstrapUsername = process.env.BOOTSTRAP_ADMIN_USERNAME;
    originalBootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    originalClientSecret = process.env.MOCK_CLIENT_SECRET;

    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.NODE_ENV = "test";
    process.env.BOOTSTRAP_ADMIN_USERNAME = ADMIN_USERNAME;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = ADMIN_PASSWORD;
    process.env.MOCK_CLIENT_SECRET = "mock-client-secret";
    vi.resetModules();

    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/openid-configuration") {
        return discoveryResponse();
      }
      if (url.pathname === "/oauth/token") {
        const bodyText = init?.body ? String(init.body) : "";
        const body = new URLSearchParams(bodyText);
        const code = body.get("code");
        if (code === "invalid-code") {
          return new Response("Unauthorized", { status: 401 });
        }
        if (code === "mock-code-new-user") {
          return tokenResponse({
            sub: "new-oidc-sub",
            preferred_username: "newoidcuser",
            email: "new@example.com",
            name: "New OIDC User",
          });
        }
        return tokenResponse({
          sub: "existing-oidc-sub",
          preferred_username: "oidcuser",
          email: "oidc@example.com",
          name: "OIDC User",
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const { bootstrapAdmin } = await import("../../src/services/bootstrap-service.js");
    await bootstrapAdmin();

    const { buildApp } = await import("../../src/app.js");
    app = await buildApp();
    await app.ready();

    adminSession = await loginAs(app, ADMIN_USERNAME, ADMIN_PASSWORD);
  });

  afterEach(async () => {
    fetchSpy?.mockRestore();
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
    if (originalClientSecret !== undefined) process.env.MOCK_CLIENT_SECRET = originalClientSecret;
    else delete process.env.MOCK_CLIENT_SECRET;
    vi.resetModules();
  });

  async function configureOidc(overrides: Record<string, unknown> = {}): Promise<unknown> {
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: {
        enabled: true,
        issuer: ISSUER,
        clientId: "componode-client",
        clientSecretRef: "MOCK_CLIENT_SECRET",
        roleClaimPath: "groups",
        claimValueField: "name",
        roleMapping: { "componode-admins": "ADMIN" },
        ...overrides,
      },
    });
    expect(res.statusCode).toBe(200);
    return res.json();
  }

  async function initiateLogin(): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oidc/login",
      cookies: csrfCookie,
      headers: csrfHeader,
    });
    expect(res.statusCode).toBe(302);
    const location = res.headers["location"];
    expect(typeof location).toBe("string");
    return new URL(location as string).searchParams.get("state") ?? "";
  }

  it("admin configures OIDC via PUT /api/v1/settings/oidc → 200", async () => {
    const body = await configureOidc();
    expect(body.oidcConfig.enabled).toBe(true);
    expect(body.oidcConfig.issuer).toBe(ISSUER);
  });

  it("initiates OIDC login via POST /auth/oidc/login → 302 redirect", async () => {
    await configureOidc();
    const state = await initiateLogin();
    expect(state).toBeTruthy();
  });

  it("callback with a mock code+state returns 302 and sets a session cookie", async () => {
    await configureOidc();
    const state = await initiateLogin();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oidc/callback?code=mock-code&state=${state}`,
    });

    expect(res.statusCode).toBe(302);
    const setCookie = res.headers["set-cookie"];
    const headerStr = Array.isArray(setCookie) ? setCookie.join("\n") : String(setCookie ?? "");
    expect(headerStr).toContain(SESSION_COOKIE_NAME);
  });

  it("JIT-provisions a new oidcSubject as a Viewer user", async () => {
    await configureOidc();
    const state = await initiateLogin();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oidc/callback?code=mock-code-new-user&state=${state}`,
    });
    expect(res.statusCode).toBe(302);

    const persons = await testDb!.db
      .selectFrom("persons")
      .select(["persons.id", "persons.oidcSubject", "persons.role"])
      .where("persons.oidcSubject", "is not", null)
      .execute();
    const jitUser = persons.find((p) => p.oidcSubject === "new-oidc-sub");
    expect(jitUser).toBeDefined();
    expect(jitUser!.role).toBe("VIEWER");
  });

  it("callback with invalid state → 400", async () => {
    await configureOidc();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oidc/callback?code=mock-code&state=bad-state",
    });
    expect(res.statusCode).toBe(400);
  });

  it("OIDC login when disabled → 503", async () => {
    await configureOidc();
    await app.inject({
      method: "PUT",
      url: "/api/v1/settings/oidc",
      cookies: { [SESSION_COOKIE_NAME]: adminSession!, ...csrfCookie },
      headers: csrfHeader,
      payload: { enabled: false },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oidc/login",
      cookies: csrfCookie,
      headers: csrfHeader,
    });
    expect(res.statusCode).toBe(503);
  });

  it("callback with an invalid code → 400", async () => {
    await configureOidc();
    const state = await initiateLogin();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oidc/callback?code=invalid-code&state=${state}`,
    });
    expect(res.statusCode).toBe(400);
  });
});
