import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { SearchResults } from "@/api/types";

function useDebouncedValue(value: string, delayMs = 200): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Debounced global search for the command palette (spec 004 US5).
 * Disabled until the query is non-empty.
 */
export function useGlobalSearch(query: string) {
  const q = useDebouncedValue(query.trim(), 200);
  return useQuery({
    queryKey: ["search", q],
    queryFn: () =>
      api<SearchResults>(`/search?q=${encodeURIComponent(q)}&limit=8`),
    enabled: q.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
