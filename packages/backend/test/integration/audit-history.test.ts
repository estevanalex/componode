import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import {
  SESSION_COOKIE_NAME,
  createPersonInDb,
  createSessionInDb,
} from "../helpers/api.js";
import { uuidv7 } from "uuidv7";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

describe("audit per-entity and per-run history", () => {
  let testDb: TestDb;
  let app: any;
  let adminSession: string;
  let viewerSession: string;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const k of ["DATABASE_URL", "NODE_ENV", "BOOTSTRAP_ADMIN_USERNAME", "BOOTSTRAP_ADMIN_PASSWORD"]) {
      saved[k] = process.env[k];
    }
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

    const adminRow = await testDb.db
      .selectFrom("persons")
      .select(["id"])
      .where("username", "=", ADMIN_USERNAME)
      .executeTakeFirstOrThrow();
    adminSession = (await createSessionInDb(testDb.db, adminRow.id)).token;

    const viewerId = await createPersonInDb(testDb.db, {
      username: "viewer-history",
      passwordHash: "$argon2id$dummy",
      role: "VIEWER",
    });
    viewerSession = (await createSessionInDb(testDb.db, viewerId)).token;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await testDb?.cleanup();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("GET /api/v1/audit/entities/:type/:id returns only that entity's changes", async () => {
    const productA = uuidv7();
    const productB = uuidv7();

    await testDb.db
      .insertInto("entity_changes")
      .values([
        {
          id: uuidv7(),
          entityType: "digital_product",
          entityId: productA,
          action: "updated",
          changes: { name: "A" },
          createdBy: null,
          createdByName: "admin",
          createdAt: new Date().toISOString(),
        },
        {
          id: uuidv7(),
          entityType: "digital_product",
          entityId: productA,
          action: "lifecycle",
          changes: { lifecycle: "RETIRED" },
          createdBy: null,
          createdByName: "admin",
          createdAt: new Date(Date.now() + 1000).toISOString(),
        },
        {
          id: uuidv7(),
          entityType: "digital_product",
          entityId: productB,
          action: "updated",
          changes: { name: "B" },
          createdBy: null,
          createdByName: "admin",
          createdAt: new Date().toISOString(),
        },
      ])
      .execute();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/audit/entities/digital_product/${productA}`,
      cookies: { [SESSION_COOKIE_NAME]: viewerSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.items.every((i: { entityId: string }) => i.entityId === productA)).toBe(true);
    expect(body.items[0].action).toBe("lifecycle");
    expect(body.items[1].action).toBe("updated");
  });

  it("survives deleted actor and still shows recorded name", async () => {
    const actorId = await createPersonInDb(testDb.db, {
      username: "deleted-actor",
      passwordHash: "$argon2id$dummy",
      role: "EDITOR",
      displayName: "Deleted Actor",
    });
    const productId = uuidv7();

    await testDb.db
      .insertInto("entity_changes")
      .values({
        id: uuidv7(),
        entityType: "digital_product",
        entityId: productId,
        action: "updated",
        changes: { name: "With Actor" },
        createdBy: actorId,
        createdByName: "Deleted Actor",
        createdAt: new Date().toISOString(),
      })
      .execute();

    await testDb.db.deleteFrom("persons").where("id", "=", actorId).execute();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/audit/entities/digital_product/${productId}`,
      cookies: { [SESSION_COOKIE_NAME]: viewerSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].createdByName).toBe("Deleted Actor");
  });

  it("GET /api/v1/importer-configs/:configId/runs/:runId/changes returns run changes and errors", async () => {
    const configId = uuidv7();
    const runId = uuidv7();

    await testDb.db
      .insertInto("importer_configs")
      .values({
        id: configId,
        importerName: "aws",
        label: "aws",
        scope: { accounts: [] },
        secretRefs: [],
        enabled: true,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    await testDb.db
      .insertInto("import_runs")
      .values({
        id: runId,
        configId,
        status: "COMPLETED",
        assetsProcessed: 1,
        assetsCreated: 1,
        assetsUpdated: 0,
        instancesOrphaned: 0,
        componentsRetired: 0,
        createdAt: new Date().toISOString(),
      })
      .execute();

    const componentId = uuidv7();
    await testDb.db
      .insertInto("entity_changes")
      .values({
        id: uuidv7(),
        entityType: "component",
        entityId: componentId,
        action: "created",
        changes: { name: "Imported Component" },
        importRunId: runId,
        createdBy: null,
        createdByName: "importer:aws",
        createdAt: new Date().toISOString(),
      })
      .execute();

    await testDb.db
      .insertInto("import_run_errors")
      .values({
        id: uuidv7(),
        runId,
        assetExternalId: "missing",
        errorType: "PARSE_ERROR",
        errorMessage: "Could not parse",
        createdAt: new Date().toISOString(),
      })
      .execute();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/importer-configs/${configId}/runs/${runId}/changes`,
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0].action).toBe("created");
    expect(body.changes[0].createdByName).toBe("importer:aws");
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].errorType).toBe("PARSE_ERROR");
  });

  it("returns an empty state for entities with no history", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/audit/entities/digital_product/${uuidv7()}`,
      cookies: { [SESSION_COOKIE_NAME]: viewerSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/audit/entities/digital_product/${uuidv7()}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
