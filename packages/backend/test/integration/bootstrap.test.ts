import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";

describe("bootstrap", () => {
  let testDb: TestDb | null = null;
  let originalDbUrl: string | undefined;
  let originalBootstrapUsername: string | undefined;
  let originalBootstrapPassword: string | undefined;

  beforeEach(() => {
    originalDbUrl = process.env.DATABASE_URL;
    originalBootstrapUsername = process.env.BOOTSTRAP_ADMIN_USERNAME;
    originalBootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup();
      testDb = null;
    }
    if (originalDbUrl !== undefined) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    if (originalBootstrapUsername !== undefined) {
      process.env.BOOTSTRAP_ADMIN_USERNAME = originalBootstrapUsername;
    } else {
      delete process.env.BOOTSTRAP_ADMIN_USERNAME;
    }
    if (originalBootstrapPassword !== undefined) {
      process.env.BOOTSTRAP_ADMIN_PASSWORD = originalBootstrapPassword;
    } else {
      delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    }
    vi.resetModules();
  });

  it("creates admin user on first boot with env vars set", async () => {
    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.BOOTSTRAP_ADMIN_USERNAME = "admin";
    process.env.BOOTSTRAP_ADMIN_PASSWORD = "AdminPassword123!";

    vi.resetModules();
    const { bootstrapAdmin } = await import("../../src/services/bootstrap-service.js");
    await bootstrapAdmin();

    const users = await testDb.db.selectFrom("persons").selectAll().execute();
    expect(users).toHaveLength(1);
    expect(users[0]!.username).toBe("admin");
    expect(users[0]!.role).toBe("ADMIN");
    expect(users[0]!.passwordHash).not.toBe("AdminPassword123!");

    const { verifyPassword } = await import("../../src/utils/argon2.js");
    const valid = await verifyPassword("AdminPassword123!", users[0]!.passwordHash!);
    expect(valid).toBe(true);
  });

  it("skips bootstrap on non-empty database", async () => {
    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.BOOTSTRAP_ADMIN_USERNAME = "admin";
    process.env.BOOTSTRAP_ADMIN_PASSWORD = "AdminPassword123!";

    // Insert a user first using the test db directly
    await testDb.db
      .insertInto("persons")
      .values({
        id: crypto.randomUUID(),
        username: "existinguser",
        passwordHash: "hash",
        role: "VIEWER",
        slug: "existinguser",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    vi.resetModules();
    const { bootstrapAdmin } = await import("../../src/services/bootstrap-service.js");
    await bootstrapAdmin();

    const users = await testDb.db.selectFrom("persons").selectAll().execute();
    expect(users).toHaveLength(1);
    expect(users[0]!.username).toBe("existinguser");
  });
});
