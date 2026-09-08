import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ActivityFeedItem, EntityChange, ImportRunError } from "@componode/core";

interface FeedResponse {
  items: ActivityFeedItem[];
  total: number;
  limit: number;
  offset: number;
}

interface HistoryResponse {
  items: ActivityFeedItem[];
  total: number;
  limit: number;
  offset: number;
}

interface RunChangesResponse {
  changes: EntityChange[];
  errors: ImportRunError[];
}

export interface ActivityFeedQuery {
  kind?: "entity" | "edge";
  entityType?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function useActivityFeed(query: ActivityFeedQuery = {}) {
  return useQuery<FeedResponse>({
    queryKey: ["audit", "activity", query],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const qs = params.toString();
      return api<FeedResponse>(`/audit/activity${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useEntityHistory(entityType: string, entityId: string, query: Omit<ActivityFeedQuery, "entityType"> = {}) {
  return useQuery<HistoryResponse>({
    queryKey: ["audit", "history", entityType, entityId, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const qs = params.toString();
      return api<HistoryResponse>(`/audit/entities/${entityType}/${entityId}${qs ? `?${qs}` : ""}`);
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useRunChanges(configId: string, runId: string) {
  return useQuery<RunChangesResponse>({
    queryKey: ["importer", "run", configId, runId, "changes"],
    queryFn: async () =>
      api<RunChangesResponse>(`/importer-configs/${configId}/runs/${runId}/changes`),
    enabled: !!configId && !!runId,
  });
}
