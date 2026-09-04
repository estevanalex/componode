import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ComponentWithInstances, ComponentGroup, ComponentListResponse } from "@/api/types";

export interface ComponentListFilters {
  page?: number;
  pageSize?: number;
  category?: string;
  provider?: string;
  lifecycle?: string;
  status?: string;
  group?: string;
  search?: string;
  sort?: "name" | "lastSeenAt" | "createdAt";
  order?: "asc" | "desc";
}

function buildQueryString(filters: ComponentListFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useComponents(filters: ComponentListFilters = {}) {
  return useQuery({
    queryKey: ["components", filters],
    queryFn: () =>
      api<ComponentListResponse>(`/components${buildQueryString(filters)}`),
  });
}

export function useComponentGroups() {
  return useQuery({
    queryKey: ["component-groups"],
    queryFn: () => api<{ groups: ComponentGroup[] }>("/component-groups"),
  });
}

export function useComponentDetail(id: string | null) {
  return useQuery({
    queryKey: ["components", id],
    queryFn: () => api<{ component: ComponentWithInstances }>(`/components/${id}`),
    enabled: id !== null,
  });
}
