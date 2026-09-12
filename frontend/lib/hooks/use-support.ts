import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Page, SupportStatus, SupportTicket } from "@/lib/types";

export interface SupportTicketCreateInput {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

export function useMyTickets(page = 1, page_size = 20) {
  return useQuery({
    queryKey: ["support", "my-tickets", page, page_size],
    queryFn: () => api.get<Page<SupportTicket>>("/support/tickets", { page, page_size }),
  });
}

export function useAllTickets(status: SupportStatus | "" | undefined, page = 1, page_size = 20) {
  return useQuery({
    queryKey: ["support", "all-tickets", status, page, page_size],
    queryFn: () =>
      api.get<Page<SupportTicket>>("/support/admin/tickets", { status: status || undefined, page, page_size }),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupportTicketCreateInput) => api.post<SupportTicket>("/support/tickets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support"] }),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: SupportStatus }) =>
      api.patch<SupportTicket>(`/support/admin/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support"] }),
  });
}
