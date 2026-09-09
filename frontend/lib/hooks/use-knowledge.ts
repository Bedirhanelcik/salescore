import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { KnowledgeCategory, KnowledgeTerm } from "@/lib/types";

export function useKnowledgeCategories() {
  return useQuery({
    queryKey: ["knowledge", "categories"],
    queryFn: () => api.get<KnowledgeCategory[]>("/knowledge/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useKnowledgeTerms(params: { category_id?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ["knowledge", "terms", params],
    queryFn: () => api.get<KnowledgeTerm[]>("/knowledge/terms", params),
    staleTime: 5 * 60_000,
  });
}

export function useKnowledgeTerm(key: string | undefined) {
  return useQuery({
    queryKey: ["knowledge", "term", key],
    queryFn: () => api.get<KnowledgeTerm>(`/knowledge/terms/${key}`),
    enabled: !!key,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
