import type { RelationshipType } from "../constants/index.js";

export interface EntityChange {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface EdgeChange {
  id: string;
  edgeType: RelationshipType;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  action: string;
  reason?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}
