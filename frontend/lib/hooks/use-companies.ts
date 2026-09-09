import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Company, Customer360, Page } from "@/lib/types";

export interface CompanyFilters {
  page?: number;
  page_size?: number;
  search?: string;
  industry?: string;
  country?: string;
  status?: string;
  owner_id?: number;
  sort_by?: string;
  sort_dir?: string;
}

export function useCompanies(filters: CompanyFilters) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: () => api.get<Page<Company>>("/companies", filters as Record<string, string | number>),
  });
}

export function useCompany(id: number | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => api.get<Company>(`/companies/${id}`),
    enabled: !!id,
  });
}

export function useCustomer360(id: number | undefined) {
  return useQuery({
    queryKey: ["companies", id, "360"],
    queryFn: () => api.get<Customer360>(`/companies/${id}/360`),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Company>("/companies", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch<Company>(`/companies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/companies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
