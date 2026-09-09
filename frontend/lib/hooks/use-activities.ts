import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Activity, Page } from "@/lib/types";

export interface ActivityFilters {
  page?: number;
  page_size?: number;
  type?: string;
  company_id?: number;
  deal_id?: number;
  owner_id?: number;
}

export function useActivities(filters: ActivityFilters) {
  return useQuery({
    queryKey: ["activities", filters],
    queryFn: () => api.get<Page<Activity>>("/activities", filters as Record<string, string | number>),
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Activity>("/activities", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/activities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}
