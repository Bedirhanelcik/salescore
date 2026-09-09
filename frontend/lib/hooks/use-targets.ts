import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { SalesTarget } from "@/lib/types";

export function useSalesTargets(params: { employee_id?: number; department_id?: number } = {}) {
  return useQuery({
    queryKey: ["sales-targets", params],
    queryFn: () => api.get<SalesTarget[]>("/sales-targets", params as Record<string, number>),
  });
}

export function useCreateSalesTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<SalesTarget>("/sales-targets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-targets"] }),
  });
}

export function useDeleteSalesTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sales-targets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-targets"] }),
  });
}
