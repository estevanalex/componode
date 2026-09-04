import { uuidv7 } from "uuidv7";
import {
  createComponentGroupSchema,
  updateComponentGroupSchema,
  updateComponentGroupAssignmentSchema,
  type CreateComponentGroupInput,
  type UpdateComponentGroupInput,
  type UpdateComponentGroupAssignmentInput,
  type ListComponentGroupsQuery,
  listComponentGroupsQuerySchema,
} from "@componode/core";
import { db } from "../db/connection.js";

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
}

async function assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
  const existing = await db
    .selectFrom("component_groups")
    .select("id")
    .where("slug", "=", slug)
    .executeTakeFirst();
  if (existing && existing.id !== excludeId) {
    throw Object.assign(new Error("Slug already in use; choose another"), {
      statusCode: 409,
      code: "SLUG_CONFLICT",
    });
  }
}

export async function listComponentGroups(rawQuery: ListComponentGroupsQuery) {
  const parsed = listComponentGroupsQuerySchema.parse(rawQuery);
  let query = db
    .selectFrom("component_groups")
    .leftJoin("teams", "component_groups.teamOwnerId", "teams.id")
    .select([
      "component_groups.id",
      "component_groups.name",
      "component_groups.slug",
      "component_groups.description",
      "component_groups.lifecycle",
      "component_groups.teamOwnerId",
      "teams.name as teamOwnerName",
      "component_groups.createdAt",
      "component_groups.updatedAt",
    ]);

  if (parsed.lifecycle) {
    query = query.where("component_groups.lifecycle", "=", parsed.lifecycle);
  } else {
    query = query.where("component_groups.lifecycle", "!=", "RETIRED");
  }

  return query.orderBy("component_groups.name").execute();
}

export async function getComponentGroup(id: string) {
  return db
    .selectFrom("component_groups")
    .leftJoin("teams", "component_groups.teamOwnerId", "teams.id")
    .select([
      "component_groups.id",
      "component_groups.name",
      "component_groups.slug",
      "component_groups.description",
      "component_groups.lifecycle",
      "component_groups.teamOwnerId",
      "teams.name as teamOwnerName",
      "component_groups.createdAt",
      "component_groups.updatedAt",
    ])
    .where("component_groups.id", "=", id)
    .executeTakeFirst();
}

export async function createComponentGroup(
  input: CreateComponentGroupInput,
  createdBy: string | null,
) {
  const parsed = createComponentGroupSchema.parse(input);
  if (!isValidSlug(parsed.slug)) {
    throw Object.assign(new Error("Invalid slug"), {
      statusCode: 400,
      code: "VALIDATION_FAILED",
    });
  }
  await assertUniqueSlug(parsed.slug);

  const id = uuidv7();
  const now = new Date().toISOString();
  await db
    .insertInto("component_groups")
    .values({
      id,
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description ?? null,
      lifecycle: "ACTIVE",
      teamOwnerId: parsed.teamOwnerId ?? null,
      createdBy,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  return getComponentGroup(id);
}

export async function updateComponentGroup(
  id: string,
  input: UpdateComponentGroupInput,
  updatedBy: string | null,
) {
  const existing = await getComponentGroup(id);
  if (!existing) {
    return null;
  }

  const parsed = updateComponentGroupSchema.parse(input);
  if (parsed.slug && !isValidSlug(parsed.slug)) {
    throw Object.assign(new Error("Invalid slug"), {
      statusCode: 400,
      code: "VALIDATION_FAILED",
    });
  }
  if (parsed.slug) {
    await assertUniqueSlug(parsed.slug, id);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.slug !== undefined) updates.slug = parsed.slug;
  if (parsed.description !== undefined) updates.description = parsed.description ?? null;
  if (parsed.lifecycle !== undefined) updates.lifecycle = parsed.lifecycle;
  if (parsed.teamOwnerId !== undefined) updates.teamOwnerId = parsed.teamOwnerId ?? null;

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  updates.updatedBy = updatedBy;
  updates.updatedAt = new Date().toISOString();

  await db
    .updateTable("component_groups")
    .set(updates)
    .where("id", "=", id)
    .execute();

  return getComponentGroup(id);
}

export async function deleteComponentGroup(id: string) {
  const existing = await getComponentGroup(id);
  if (!existing) {
    return null;
  }

  // DB FK on components.componentGroupId uses ON DELETE SET NULL, so members are
  // orphaned automatically.
  await db
    .deleteFrom("component_groups")
    .where("id", "=", id)
    .execute();

  return existing;
}

export async function assignComponentGroup(
  componentId: string,
  input: UpdateComponentGroupAssignmentInput,
) {
  const parsed = updateComponentGroupAssignmentSchema.parse(input);

  if (parsed.componentGroupId) {
    const group = await getComponentGroup(parsed.componentGroupId);
    if (!group) {
      throw Object.assign(new Error("Component group not found"), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }
  }

  const existing = await db
    .selectFrom("components")
    .select("id")
    .where("id", "=", componentId)
    .executeTakeFirst();
  if (!existing) {
    throw Object.assign(new Error("Component not found"), {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }

  await db
    .updateTable("components")
    .set({ componentGroupId: parsed.componentGroupId })
    .where("id", "=", componentId)
    .execute();

  return getComponentGroupByComponentId(componentId);
}

async function getComponentGroupByComponentId(componentId: string) {
  return db
    .selectFrom("components")
    .leftJoin("component_groups", "components.componentGroupId", "component_groups.id")
    .select([
      "components.id",
      "component_groups.id as componentGroupId",
      "component_groups.name as componentGroupName",
    ])
    .where("components.id", "=", componentId)
    .executeTakeFirst();
}
