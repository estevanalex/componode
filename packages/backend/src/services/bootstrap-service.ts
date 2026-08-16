import { uuidv7 } from "uuidv7";
import { db } from "../db/connection.js";
import { hashPassword } from "../utils/argon2.js";

/**
 * Bootstrap admin account on first boot (ADR-066).
 * If the persons table is empty and BOOTSTRAP_ADMIN_USERNAME/PASSWORD are set,
 * creates an admin account. Skipped if the database is non-empty.
 */
export async function bootstrapAdmin(): Promise<void> {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username || !password) {
    // Only required on first boot with empty DB
    const countResult = await db.selectFrom("persons").select(db.fn.countAll().as("count")).executeTakeFirst();
    const personCount = Number(countResult?.count ?? 0);
    if (personCount === 0) {
      throw new Error(
        "BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD must be set on first boot (empty database).",
      );
    }
    return;
  }

  // Check if DB is empty
  const countResult = await db.selectFrom("persons").select(db.fn.countAll().as("count")).executeTakeFirst();
  const personCount = Number(countResult?.count ?? 0);

  if (personCount > 0) {
    console.log("Database is non-empty, skipping bootstrap admin creation.");
    return;
  }

  const passwordHash = await hashPassword(password);
  const slug = username.toLowerCase();
  const now = new Date().toISOString();

  await db
    .insertInto("persons")
    .values({
      id: uuidv7(),
      username,
      passwordHash,
      role: "ADMIN",
      displayName: username,
      slug,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  console.log(`Bootstrap admin created: ${username}`);
}
