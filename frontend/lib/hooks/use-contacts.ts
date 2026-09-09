import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Contact, Page } from "@/lib/types";

export interface ContactFilters {
  page?: number;
  page_size?: number;
  search?: string;
  company_id?: number;
  owner_id?: number;
}

export function useContacts(filters: ContactFilters) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: () => api.get<Page<Contact>>("/contacts", filters as Record<string, string | number>),
  });
}

export function useContact(id: number | undefined) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => api.get<Contact>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Contact>("/contacts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
