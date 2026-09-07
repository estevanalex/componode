import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import {
  loginAs,
  SESSION_COOKIE_NAME,
  csrfCookie,
  csrfHeader,
  createPersonInDb,
  createSessionInDb,
} from "../helpers/api.js";
import { uuidv7 } from "uuidv7";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "AdminPassword123!";

function now() {
  return new Date().toISOString();
}

describe("org entity API (lobs + teams)", () => {
  let testDb: TestDb;
  let app: any;
  let adminSession: string;
  let viewerSession: string | undefined;
  let editorSession: string | undefined;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const k of [
      "DATABASE_URL",
      "NODE_ENV",
      "BOOTSTRAP_ADMIN_USERNAME",
      "BOOTSTRAP_ADMIN_PASSWORD",
    ]) {
      saved[k] = process.env[k];
    }
    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.NODE_ENV = "test";
    process.env.BOOTSTRAP_ADMIN_USERNAME = ADMIN_USERNAME;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = ADMIN_PASSWORD;

    const { bootstrapAdmin } = await import(
      "../../src/services/bootstrap-service.js"
    );
    await bootstrapAdmin();
    const { buildApp } = await import("../../src/app.js");
    app = await buildApp();
    await app.ready();
    adminSession = (await loginAs(app, ADMIN_USERNAME, ADMIN_PASSWORD))!;
    const viewerId = await createPersonInDb(testDb.db, {
      username: "v1",
      role: "VIEWER",
    });
    viewerSession = await createSessionInDb(testDb.db, viewerId);
    const editorId = await createPersonInDb(testDb.db, {
      username: "e1",
      role: "EDITOR",
    });
    editorSession = await createSessionInDb(testDb.db, editorId);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await testDb?.cleanup();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const authed = (session?: string) => ({
    cookies: { [SESSION_COOKIE_NAME]: session ?? adminSession, ...csrfCookie },
    headers: csrfHeader,
  });

  it("CRUD works for editor; viewer is read-only", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/lobs",
      ...authed(editorSession),
      payload: { name: "Revenue" },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().lob.slug).toBe("revenue");

    const viewerPost = await app.inject({
      method: "POST",
      url: "/api/v1/lobs",
      ...authed(viewerSession),
      payload: { name: "Nope" },
    });
    expect(viewerPost.statusCode).toBe(403);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/lobs",
      ...authed(viewerSession),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().lobs.some((l: any) => l.slug === "revenue")).toBe(true);
  });

  it("team roster returns members; delete blocked while referenced", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/teams",
      ...authed(editorSession),
      payload: { name: "Payments Eng" },
    });
    const teamId = create.json().team.id;

    // Assign a person to the team + a product owner reference.
    const memberId = await createPersonInDb(testDb.db, {
      username: "member1",
      role: "VIEWER",
    });
    await testDb.db
      .updateTable("persons")
      .set({ teamId })
      .where("id", "=", memberId)
      .execute();
    await testDb.db
      .insertInto("digital_products")
      .values({
        id: uuidv7(),
        name: "Owned",
        slug: `owned-${Date.now()}`,
        description: null,
        type: "PLATFORM",
        lifecycle: "ACTIVE",
        lobOwnerId: null,
        teamOwnerId: teamId,
        createdBy: null,
        updatedBy: null,
        createdAt: now(),
        updatedAt: now(),
      } as never)
      .execute();

    const members = await app.inject({
      method: "GET",
      url: `/api/v1/teams/${teamId}/members`,
      ...authed(viewerSession),
    });
    expect(members.statusCode).toBe(200);
    expect(members.json().members.map((m: any) => m.username)).toContain("member1");

    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/teams/${teamId}`,
      ...authed(editorSession),
    });
    expect(del.statusCode).toBe(409);
    expect(del.json().code).toBe("REFERENCED");
    expect(del.json().details.counts.members).toBe(1);
    expect(del.json().details.counts.products).toBe(1);

    // Unassign → delete succeeds
    await testDb.db
      .updateTable("persons")
      .set({ teamId: null })
      .where("id", "=", memberId)
      .execute();
    await testDb.db
      .updateTable("digital_products")
      .set({ teamOwnerId: null })
      .where("teamOwnerId", "=", teamId)
      .execute();
    const del2 = await app.inject({
      method: "DELETE",
      url: `/api/v1/teams/${teamId}`,
      ...authed(editorSession),
    });
    expect(del2.statusCode).toBe(204);
  });
});
