import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { uuidv7 } from "uuidv7";
import { startTestDb, type TestDb } from "../helpers/testcontainers.js";
import { createPersonInDb } from "../helpers/api.js";

const TEST_TIMEOUT = 60000;

describe("password reset service", () => {
  let testDb: TestDb | null = null;
  let originalDbUrl: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalDbUrl = process.env.DATABASE_URL;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup();
      testDb = null;
    }
    if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
    else delete process.env.DATABASE_URL;
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
    vi.resetModules();
  });

  async function setup() {
    testDb = await startTestDb();
    process.env.DATABASE_URL = testDb.container.getConnectionUri();
    process.env.NODE_ENV = "test";
    vi.resetModules();
  }

  it(
    "generateResetToken creates a token hash row in the DB",
    async () => {
      await setup();
      const { hashPassword } = await import("../../src/utils/argon2.js");
      const userId = await createPersonInDb(testDb!.db, {
        username: "tokenuser",
        passwordHash: await hashPassword("OldPassword123!"),
      });

      const { generatePasswordReset } = await import("../../src/services/password-reset-service.js");
      const token = await generatePasswordReset(userId);

      // Plaintext token is returned once
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);

      // A token hash row exists in the DB (not the plaintext)
      const rows = await testDb!.db
        .selectFrom("password_reset_tokens")
        .selectAll()
        .where("password_reset_tokens.userId", "=", userId)
        .execute();
      expect(rows).toHaveLength(1);
      expect(rows[0]!.tokenHash).toBeTruthy();
      expect(rows[0]!.tokenHash).not.toBe(token); // hash, not plaintext
      expect(rows[0]!.usedAt).toBeNull();
    },
    TEST_TIMEOUT,
  );

  it(
    "confirmPasswordReset with a valid token + new password updates the password",
    async () => {
      await setup();
      const { hashPassword, verifyPassword } = await import("../../src/utils/argon2.js");
      const userId = await createPersonInDb(testDb!.db, {
        username: "confirmuser",
        passwordHash: await hashPassword("OldPassword123!"),
      });

      const { generatePasswordReset, confirmPasswordReset } = await import("../../src/services/password-reset-service.js");
      const token = await generatePasswordReset(userId);

      await confirmPasswordReset(token, "NewPassword123!");

      // The person's passwordHash should now verify against the new password
      const person = await testDb!.db
        .selectFrom("persons")
        .select("persons.passwordHash")
        .where("persons.id", "=", userId)
        .executeTakeFirst();
      expect(person?.passwordHash).toBeTruthy();
      const valid = await verifyPassword("NewPassword123!", person!.passwordHash!);
      expect(valid).toBe(true);

      // The token row is marked used
      const tokenRow = await testDb!.db
        .selectFrom("password_reset_tokens")
        .select("password_reset_tokens.usedAt")
        .where("password_reset_tokens.userId", "=", userId)
        .executeTakeFirst();
      expect(tokenRow?.usedAt).not.toBeNull();
    },
    TEST_TIMEOUT,
  );

  it(
    "reusing a reset token throws AUTH_RESET_TOKEN_USED",
    async () => {
      await setup();
      const { hashPassword } = await import("../../src/utils/argon2.js");
      const userId = await createPersonInDb(testDb!.db, {
        username: "reuseuser",
        passwordHash: await hashPassword("OldPassword123!"),
      });

      const { generatePasswordReset, confirmPasswordReset } = await import("../../src/services/password-reset-service.js");
      const token = await generatePasswordReset(userId);

      await confirmPasswordReset(token, "NewPassword123!");

      await expect(confirmPasswordReset(token, "AnotherPassword123!")).rejects.toMatchObject({
        statusCode: 400,
        code: "AUTH_RESET_TOKEN_USED",
      });
    },
    TEST_TIMEOUT,
  );

  it(
    "an expired reset token throws AUTH_RESET_TOKEN_EXPIRED",
    async () => {
      await setup();
      const { hashPassword } = await import("../../src/utils/argon2.js");
      const { hashToken } = await import("../../src/utils/crypto.js");
      const userId = await createPersonInDb(testDb!.db, {
        username: "expireduser",
        passwordHash: await hashPassword("OldPassword123!"),
      });

      // Insert an already-expired token directly
      const past = new Date(Date.now() - 60 * 1000).toISOString();
      await testDb!.db
        .insertInto("password_reset_tokens")
        .values({
          id: uuidv7(),
          userId,
          tokenHash: hashToken("expired-token-value"),
          expiresAt: past,
          createdAt: past,
        })
        .execute();

      const { confirmPasswordReset } = await import("../../src/services/password-reset-service.js");
      await expect(
        confirmPasswordReset("expired-token-value", "NewPassword123!"),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "AUTH_RESET_TOKEN_EXPIRED",
      });
    },
    TEST_TIMEOUT,
  );
});
