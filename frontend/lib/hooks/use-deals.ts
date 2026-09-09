import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Deal, DealListItem, DealStageHistoryItem, Page, PipelineBoard } from "@/lib/types";

export interface DealFilters {
  page?: number;
  page_size?: number;
  stage?: string;
  owner_id?: number;
  company_id?: number;
  search?: string;
  min_value?: number;
  max_value?: number;
  sort_by?: string;
  sort_dir?: string;
}

export function useDeals(filters: DealFilters) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: () => api.get<Page<DealListItem>>("/deals", filters as Record<string, string | number>),
  });
}

export function useDeal(id: number | undefined) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: () => api.get<Deal>(`/deals/${id}`),
    enabled: !!id,
  });
}

export function useDealHistory(id: number | undefined) {
  return useQuery({
    queryKey: ["deals", id, "history"],
    queryFn: () => api.get<DealStageHistoryItem[]>(`/deals/${id}/history`),
    enabled: !!id,
  });
}

export function usePipeline(owner_id?: number) {
  return useQuery({
    queryKey: ["deals", "pipeline", owner_id],
    queryFn: () => api.get<PipelineBoard>("/deals/pipeline", owner_id ? { owner_id } : undefined),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Deal>("/deals", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateDeal(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch<Deal>(`/deals/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useChangeDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; stage: string; note?: string; lost_reason?: string }) =>
      api.patch<Deal>(`/deals/${id}/stage`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
