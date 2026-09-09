import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { SearchResultItem } from "@/lib/types";

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => api.get<{ query: string; results: SearchResultItem[] }>("/search", { q: query }),
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });
}
