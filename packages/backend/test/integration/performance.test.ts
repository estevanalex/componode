import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import { loginAs, SESSION_COOKIE_NAME } from "../helpers/api.js";
import { uuidv7 } from "uuidv7";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

function now() {
  return new Date().toISOString();
}

function buildComponentRecord(i: number) {
  return {
    id: uuidv7(),
    name: `Perf Component ${i}`,
    slug: `perf-component-${i}`,
    category: "API",
    provider: "GITHUB",
    resourceType: "github:repository",
    lifecycle: "ACTIVE",
    details: null,
    componentGroupId: null,
    externalId: null,
    lastSeenAt: null,
    lastSeenInRunId: null,
    createdBy: null,
    updatedBy: null,
    createdAt: now(),
    updatedAt: now(),
  };
}

describe("components catalog performance", () => {
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

    adminSession = (await loginAs(app, ADMIN_USERNAME, ADMIN_PASSWORD)) ?? "";
  });

  beforeEach(async () => {
    await testDb.db.deleteFrom("component_instances").execute();
    await testDb.db.deleteFrom("components").execute();
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

  it("returns the first page within one second for 1,000 components", async () => {
    const records = Array.from({ length: 1000 }, (_, i) => buildComponentRecord(i));
    await testDb.db.insertInto("components").values(records as any).execute();

    const start = Date.now();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/components?page=1&pageSize=50",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    const body = JSON.parse(res.payload);
    const duration = Date.now() - start;

    expect(res.statusCode).toBe(200);
    expect(body.data).toHaveLength(50);
    expect(body.pagination.total).toBe(1000);

    // Target: the catalog list API should remain responsive with 1,000 rows.
    // Testcontainers on constrained CI runners can occasionally be slower, so
    // the threshold is relaxed to 1,500 ms when 1,000 ms proves too tight.
    const MAX_DURATION_MS = 1000;
    expect(duration).toBeLessThan(MAX_DURATION_MS);
  });
});
