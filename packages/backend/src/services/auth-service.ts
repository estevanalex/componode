import { db } from "../db/connection.js";
import { generateSessionToken } from "../utils/crypto.js";
import { verifyPassword } from "../utils/argon2.js";
import { metrics } from "../plugins/metrics.js";

const ABSOLUTE_TIMEOUT_MS = parseInt(
  process.env.SESSION_ABSOLUTE_TIMEOUT_MS ?? "43200000",
  10,
); // 12h default

interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
}

export async function login(
  username: string,
  password: string,
): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
  const user = await db
    .selectFrom("persons")
    .select([
      "persons.id",
      "persons.username",
      "persons.role",
      "persons.displayName",
      "persons.passwordHash",
      "persons.isActive",
    ])
    .where("persons.username", "=", username)
    .executeTakeFirst();

  if (!user || !user.isActive || !user.passwordHash) {
    metrics.authEventsTotal.inc({ event: "login", outcome: "failure" });
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401, code: "AUTH_INVALID_CREDENTIALS" });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    metrics.authEventsTotal.inc({ event: "login", outcome: "failure" });
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401, code: "AUTH_INVALID_CREDENTIALS" });
  }

  const sessionToken = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

  await db
    .insertInto("sessions")
    .values({
      id: sessionToken,
      userId: user.id,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    .execute();

  metrics.authEventsTotal.inc({ event: "login", outcome: "success" });

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
    sessionToken,
  };
}

export async function logout(sessionToken: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .updateTable("sessions")
    .set({ revokedAt: now })
    .where("sessions.id", "=", sessionToken)
    .execute();
  metrics.authEventsTotal.inc({ event: "logout", outcome: "success" });
}
