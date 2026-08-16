import { uuidv7 } from "uuidv7";
import { db } from "../db/connection.js";
import { generateResetToken, hashToken } from "../utils/crypto.js";
import { hashPassword } from "../utils/argon2.js";

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export async function generatePasswordReset(userId: string): Promise<string> {
  const token = generateResetToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_EXPIRY_MS);

  await db
    .insertInto("password_reset_tokens")
    .values({
      id: uuidv7(),
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .execute();

  return token; // Plaintext token — returned once to the admin
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);

  const resetToken = await db
    .selectFrom("password_reset_tokens")
    .selectAll()
    .where("password_reset_tokens.tokenHash", "=", tokenHash)
    .executeTakeFirst();

  if (!resetToken) {
    throw Object.assign(new Error("Invalid reset token"), {
      statusCode: 400,
      code: "AUTH_RESET_TOKEN_INVALID",
    });
  }

  if (resetToken.usedAt !== null) {
    throw Object.assign(new Error("Reset token already used"), {
      statusCode: 400,
      code: "AUTH_RESET_TOKEN_USED",
    });
  }

  if (new Date(resetToken.expiresAt) < new Date()) {
    throw Object.assign(new Error("Reset token expired"), {
      statusCode: 400,
      code: "AUTH_RESET_TOKEN_EXPIRED",
    });
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("persons")
      .set({ passwordHash, updatedAt: now })
      .where("persons.id", "=", resetToken.userId)
      .execute();

    await trx
      .updateTable("password_reset_tokens")
      .set({ usedAt: now })
      .where("password_reset_tokens.id", "=", resetToken.id)
      .execute();
  });
}
