import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { AuditLogItem, Page } from "@/lib/types";

export function useAuditLogs(params: { page?: number; page_size?: number; entity_type?: string } = {}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => api.get<Page<AuditLogItem>>("/audit-logs", params as Record<string, string | number>),
  });
}
