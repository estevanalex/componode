import { db } from "../db/connection.js";
import type { ActivityFeedItem, ActivityFeedQuery, EntityHistoryQuery } from "@componode/core";

interface FeedResult {
  items: ActivityFeedItem[];
  total: number;
}

function isValidDate(value: string | undefined): value is string {
  return value !== undefined && !Number.isNaN(Date.parse(value));
}

export async function getActivityFeed(query: ActivityFeedQuery): Promise<FeedResult> {
  const { kind, entityType, action, actor, from, to, limit, offset } = query;

  const wantEntities = kind === undefined || kind === "entity";
  const wantEdges = kind === undefined || kind === "edge";

  const entityPromise = wantEntities
    ? buildEntityChangesQuery({ entityType, action, actor, from, to }).execute()
    : Promise.resolve([]);

  const edgePromise = wantEdges
    ? buildEdgeChangesQuery({ entityType, action, actor, from, to }).execute()
    : Promise.resolve([]);

  const [entityRows, edgeRows] = await Promise.all([entityPromise, edgePromise]);

  const items = [
    ...entityRows.map((row) => ({ kind: "entity" as const, ...row })),
    ...edgeRows.map((row) => ({ kind: "edge" as const, ...row })),
  ] as unknown as ActivityFeedItem[];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  return { items: paginated, total };
}

export async function getEntityHistory(
  entityType: string,
  entityId: string,
  query: EntityHistoryQuery,
): Promise<FeedResult> {
  const { kind, action, actor, from, to, limit, offset } = query;

  const wantEntities = kind === undefined || kind === "entity";
  const wantEdges = kind === undefined || kind === "edge";

  const entityPromise = wantEntities
    ? buildEntityChangesQuery({ entityType, entityId, action, actor, from, to }).execute()
    : Promise.resolve([]);

  const edgePromise = wantEdges
    ? buildEdgeChangesQuery({
        relatedEntityType: entityType,
        relatedEntityId: entityId,
        action,
        actor,
        from,
        to,
      }).execute()
    : Promise.resolve([]);

  const [entityRows, edgeRows] = await Promise.all([entityPromise, edgePromise]);

  const items = [
    ...entityRows.map((row) => ({ kind: "entity" as const, ...row })),
    ...edgeRows.map((row) => ({ kind: "edge" as const, ...row })),
  ] as unknown as ActivityFeedItem[];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  return { items: paginated, total };
}

export async function getRunChanges(runId: string): Promise<{
  changes: import("@componode/core").EntityChange[];
  errors: import("@componode/core").ImportRunError[];
}> {
  const changes = await db
    .selectFrom("entity_changes")
    .selectAll()
    .where("importRunId", "=", runId)
    .orderBy("createdAt", "desc")
    .execute();

  const errors = await db
    .selectFrom("import_run_errors")
    .selectAll()
    .where("runId", "=", runId)
    .orderBy("createdAt", "desc")
    .execute();

  return { changes: changes as import("@componode/core").EntityChange[], errors };
}

interface CommonFilters {
  entityType?: string;
  entityId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
}

function buildEntityChangesQuery(filters: CommonFilters) {
  let q = db.selectFrom("entity_changes").selectAll();

  if (filters.entityType) {
    q = q.where("entityType", "=", filters.entityType);
  }
  if (filters.entityId) {
    q = q.where("entityId", "=", filters.entityId);
  }
  if (filters.action) {
    q = q.where("action", "=", filters.action);
  }
  if (filters.actor) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.actor);
    q = q.where((eb) => {
      const ors = [eb("createdByName", "=", filters.actor!)];
      if (isUuid) {
        ors.push(eb("createdBy", "=", filters.actor!));
      }
      return eb.or(ors);
    });
  }
  if (isValidDate(filters.from)) {
    q = q.where("createdAt", ">=", filters.from!);
  }
  if (isValidDate(filters.to)) {
    q = q.where("createdAt", "<=", filters.to!);
  }

  return q.orderBy("createdAt", "desc");
}

function buildEdgeChangesQuery(filters: CommonFilters) {
  let q = db.selectFrom("edge_changes").selectAll();

  if (filters.relatedEntityType && filters.relatedEntityId) {
    q = q.where((eb) =>
      eb.or([
        eb.and([
          eb("fromEntityType", "=", filters.relatedEntityType!),
          eb("fromEntityId", "=", filters.relatedEntityId!),
        ]),
        eb.and([
          eb("toEntityType", "=", filters.relatedEntityType!),
          eb("toEntityId", "=", filters.relatedEntityId!),
        ]),
      ]),
    );
  } else if (filters.entityType) {
    q = q.where((eb) =>
      eb.or([
        eb("fromEntityType", "=", filters.entityType!),
        eb("toEntityType", "=", filters.entityType!),
      ]),
    );
  }

  if (filters.action) {
    q = q.where("action", "=", filters.action);
  }
  if (filters.actor) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.actor);
    q = q.where((eb) => {
      const ors = [eb("createdByName", "=", filters.actor!)];
      if (isUuid) {
        ors.push(eb("createdBy", "=", filters.actor!));
      }
      return eb.or(ors);
    });
  }
  if (isValidDate(filters.from)) {
    q = q.where("createdAt", ">=", filters.from!);
  }
  if (isValidDate(filters.to)) {
    q = q.where("createdAt", "<=", filters.to!);
  }

  return q.orderBy("createdAt", "desc");
}
