import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import { loginAs, SESSION_COOKIE_NAME } from "../helpers/api.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

function now() {
  return new Date().toISOString();
}

describe("component detail", () => {
  let testDb: TestDb;
  let app: any;
  let adminSession: string;
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

  beforeEach(async () => {
    await testDb.db.deleteFrom("import_run_errors").execute();
    await testDb.db.deleteFrom("import_runs").execute();
    await testDb.db.deleteFrom("component_instances").execute();
    await testDb.db.deleteFrom("components").execute();
    await testDb.db.deleteFrom("component_groups").execute();
  });

  afterAll(async () => {
    if (app) await app.close();
    await testDb.cleanup();
    if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
    else delete process.env.DATABASE_URL;
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
    if (originalBootstrapUsername !== undefined) process.env.BOOTSTRAP_ADMIN_USERNAME = originalBootstrapUsername;
    else delete process.env.BOOTSTRAP_ADMIN_USERNAME;
    if (originalBootstrapPassword !== undefined) process.env.BOOTSTRAP_ADMIN_PASSWORD = originalBootstrapPassword;
    else delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  });

  it("returns component metadata and instances", async () => {
    const group = {
      id: "018f0000-0000-7e10-a000-000000000001",
      name: "Payments Group",
      slug: "payments-group",
      description: "Payment services",
      lifecycle: "ACTIVE",
      teamOwnerId: null,
      createdBy: null,
      updatedBy: null,
      createdAt: now(),
      updatedAt: now(),
    };
    await testDb.db.insertInto("component_groups").values(group as any).execute();

    const component = {
      id: "018f0000-0000-7e10-a000-000000000002",
      name: "Payment API",
      slug: "payment-api",
      category: "API",
      provider: "GITHUB",
      resourceType: "github:repository",
      lifecycle: "ACTIVE",
      componentGroupId: group.id,
      externalId: "payment-api",
      details: { language: "typescript" },
      createdBy: null,
      updatedBy: null,
      createdAt: now(),
      updatedAt: now(),
    };
    await testDb.db.insertInto("components").values(component as any).execute();

    await testDb.db.insertInto("component_instances").values({
      id: "018f0000-0000-7e10-a000-000000000003",
      componentId: component.id,
      environment: "PRODUCTION",
      url: "https://api.example.com",
      region: "us-east-1",
      status: "RUNNING",
      version: "1.2.3",
      externalId: "prod",
      slug: "prod",
      deployedAt: now(),
      rawConfig: null,
      lastSeenAt: null,
      lastSeenInRunId: null,
      createdBy: null,
      updatedBy: null,
      createdAt: now(),
      updatedAt: now(),
    } as any).execute();

    await testDb.db.insertInto("component_instances").values({
      id: "018f0000-0000-7e10-a000-000000000004",
      componentId: component.id,
      environment: "STAGING",
      url: null,
      region: null,
      status: "GONE",
      version: null,
      externalId: "staging",
      slug: "staging",
      deployedAt: null,
      rawConfig: null,
      lastSeenAt: null,
      lastSeenInRunId: null,
      createdBy: null,
      updatedBy: null,
      createdAt: now(),
      updatedAt: now(),
    } as any).execute();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/components/${component.id}`,
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.component.name).toBe("Payment API");
    expect(body.component.componentGroupName).toBe("Payments Group");
    expect(body.component.instances).toHaveLength(1);
    expect(body.component.instances[0].environment).toBe("PRODUCTION");
  });

  it("returns 404 for unknown component", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/components/018f0000-0000-7e10-a000-000000000999",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(404);
  });
});
