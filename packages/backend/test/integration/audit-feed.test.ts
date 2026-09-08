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

describe("audit activity feed", () => {
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
      username: "viewer-feed",
      passwordHash: "$argon2id$dummy",
      role: "VIEWER",
    });
    viewerSession = (await createSessionInDb(testDb.db, viewerId)).token;

    const adminId = adminRow;

    const productId = uuidv7();
    const componentId = uuidv7();

    // Seed entity changes across different types, actions, actors, and timestamps.
    const baseTime = new Date("2026-09-08T10:00:00.000Z").getTime();
    await testDb.db
      .insertInto("entity_changes")
      .values([
        {
          id: uuidv7(),
          entityType: "digital_product",
          entityId: productId,
          action: "updated",
          changes: { name: "Alpha Product" },
          createdBy: adminId.id,
          createdByName: "admin",
          createdAt: new Date(baseTime + 0).toISOString(),
        },
        {
          id: uuidv7(),
          entityType: "component",
          entityId: componentId,
          action: "created",
          changes: { name: "Lambda" },
          createdBy: adminId.id,
          createdByName: "admin",
          createdAt: new Date(baseTime + 60_000).toISOString(),
        },
        {
          id: uuidv7(),
          entityType: "component_group",
          entityId: uuidv7(),
          action: "updated",
          changes: { name: "Group A" },
          createdBy: null,
          createdByName: "system",
          createdAt: new Date(baseTime + 120_000).toISOString(),
        },
        {
          id: uuidv7(),
          entityType: "settings",
          entityId: null,
          action: "updated",
          changes: { allowSelfRegistration: true },
          createdBy: adminId.id,
          createdByName: "admin",
          createdAt: new Date(baseTime + 180_000).toISOString(),
        },
        {
          id: uuidv7(),
          entityType: "auth",
          entityId: null,
          action: "login",
          changes: null,
          createdBy: adminId.id,
          createdByName: "admin",
          createdAt: new Date(baseTime + 240_000).toISOString(),
        },
      ])
      .execute();

    await testDb.db
      .insertInto("edge_changes")
      .values({
        id: uuidv7(),
        edgeType: "COMPOSES",
        fromEntityType: "digital_product",
        fromEntityId: uuidv7(),
        toEntityType: "digital_product",
        toEntityId: productId,
        action: "added",
        reason: null,
        createdBy: adminId.id,
        createdByName: "admin",
        createdAt: new Date(baseTime + 300_000).toISOString(),
      })
      .execute();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await testDb?.cleanup();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("GET /api/v1/audit/activity returns merged reverse-chronological feed", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(6);
    expect(body.total).toBe(6);
    // Newest first
    expect(body.items[0].action).toBe("added");
    expect(body.items[1].action).toBe("login");
    expect(body.items[5].action).toBe("updated");
    expect(body.items[0].kind).toBe("edge");
    expect(body.items[1].kind).toBe("entity");
  });

  it("supports pagination via limit and offset", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?limit=2&offset=2",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(6);
    expect(body.items[0].createdAt >= body.items[1].createdAt).toBe(true);
  });

  it("filters by kind", async () => {
    const entityRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?kind=entity",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(entityRes.statusCode).toBe(200);
    const entityBody = entityRes.json();
    expect(entityBody.items.every((i: { kind: string }) => i.kind === "entity")).toBe(true);
    expect(entityBody.total).toBe(5);

    const edgeRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?kind=edge",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(edgeRes.statusCode).toBe(200);
    const edgeBody = edgeRes.json();
    expect(edgeBody.items.every((i: { kind: string }) => i.kind === "edge")).toBe(true);
    expect(edgeBody.total).toBe(1);
  });

  it("filters by entityType", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?entityType=digital_product",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2); // entity + edge where from/to matches
  });

  it("filters by action", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?action=updated",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.every((i: { action: string }) => i.action === "updated")).toBe(true);
    expect(body.total).toBe(3);
  });

  it("filters by actor", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?actor=system",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].createdByName).toBe("system");
  });

  it("filters by date range", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity?from=2026-09-08T10:02:00.000Z&to=2026-09-08T10:04:00.000Z",
      cookies: { [SESSION_COOKIE_NAME]: adminSession },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(3);
    // Should be component_group, settings, login (between 10:02 and 10:04 inclusive)
    expect(body.items[0].action).toBe("login");
    expect(body.items[2].action).toBe("updated");
  });

  it("denies non-admin access to the activity feed", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity",
      cookies: { [SESSION_COOKIE_NAME]: viewerSession },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("AUTH_FORBIDDEN");
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit/activity",
    });
    expect(res.statusCode).toBe(401);
  });
});
