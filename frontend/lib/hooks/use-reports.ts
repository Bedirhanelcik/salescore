import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

interface ReportPage {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function useReport(
  reportType: string,
  params: {
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_dir?: string;
    page?: number;
    page_size?: number;
  }
) {
  return useQuery({
    queryKey: ["reports", reportType, params],
    queryFn: () => api.get<ReportPage>(`/reports/${reportType}`, params as Record<string, string | number>),
    enabled: !!reportType,
  });
}
