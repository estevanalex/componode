import { db } from "../db/connection.js";
import { hashPassword } from "../utils/argon2.js";
import type { CreateUserInput, UpdateUserInput } from "@componode/core";

function slugify(username: string): string {
  return username.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export async function createUser(input: CreateUserInput) {
  // Check username uniqueness
  const existing = await db
    .selectFrom("persons")
    .select("persons.id")
    .where("persons.username", "=", input.username)
    .executeTakeFirst();

  if (existing) {
    throw Object.assign(new Error("Username already taken"), {
      statusCode: 409,
      code: "AUTH_USERNAME_TAKEN",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .insertInto("persons")
    .values({
      id,
      username: input.username,
      passwordHash,
      role: input.role,
      displayName: input.displayName ?? null,
      email: input.email ?? null,
      teamId: input.teamId ?? null,
      slug: slugify(input.username),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  return getUserById(id);
}

export async function listUsers(filters: { role?: string; isActive?: boolean; search?: string } = {}) {
  let query = db.selectFrom("persons").select([
    "persons.id",
    "persons.username",
    "persons.role",
    "persons.displayName",
    "persons.email",
    "persons.teamId",
    "persons.slug",
    "persons.isActive",
    "persons.createdAt",
    "persons.updatedAt",
  ]);

  if (filters.role) {
    query = query.where("persons.role", "=", filters.role);
  }

  if (filters.isActive !== undefined) {
    query = query.where("persons.isActive", "=", filters.isActive);
  }

  if (filters.search) {
    query = query.where("persons.username", "ilike", `%${filters.search}%`);
  }

  return query.orderBy("persons.createdAt", "desc").execute();
}

export async function getUserById(id: string) {
  return db
    .selectFrom("persons")
    .select([
      "persons.id",
      "persons.username",
      "persons.role",
      "persons.displayName",
      "persons.email",
      "persons.teamId",
      "persons.slug",
      "persons.isActive",
      "persons.createdAt",
      "persons.updatedAt",
    ])
    .where("persons.id", "=", id)
    .executeTakeFirst();
}

export async function getUserByUsername(username: string) {
  return db
    .selectFrom("persons")
    .select([
      "persons.id",
      "persons.username",
      "persons.role",
      "persons.displayName",
      "persons.email",
      "persons.teamId",
      "persons.slug",
      "persons.isActive",
      "persons.createdAt",
      "persons.updatedAt",
    ])
    .where("persons.username", "=", username)
    .executeTakeFirst();
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const updates: Record<string, unknown> = {};
  if (input.role !== undefined) updates.role = input.role;
  if (input.displayName !== undefined) updates.displayName = input.displayName;
  if (input.email !== undefined) updates.email = input.email;
  if (input.teamId !== undefined) updates.teamId = input.teamId;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  if (Object.keys(updates).length === 0) {
    return getUserById(id);
  }

  updates.updatedAt = new Date().toISOString();

  await db
    .updateTable("persons")
    .set(updates)
    .where("persons.id", "=", id)
    .execute();

  return getUserById(id);
}
