import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  BusinessInsight,
  CustomerGrowthPoint,
  FunnelAnalytics,
  KpiSummary,
  PipelineVelocity,
  RevenueAnalytics,
  SegmentationRow,
  TeamPerformance,
  WinLossRow,
} from "@/lib/types";

export function useKpis(days = 30) {
  return useQuery({
    queryKey: ["analytics", "kpis", days],
    queryFn: () => api.get<KpiSummary>("/analytics/kpis", { days }),
  });
}

export function useFunnel(days = 90) {
  return useQuery({
    queryKey: ["analytics", "funnel", days],
    queryFn: () => api.get<FunnelAnalytics>("/analytics/funnel", { days }),
  });
}

export function useRevenueTrend(months = 12) {
  return useQuery({
    queryKey: ["analytics", "revenue", months],
    queryFn: () => api.get<RevenueAnalytics>("/analytics/revenue", { months }),
  });
}

export function useTeamPerformance(days = 30) {
  return useQuery({
    queryKey: ["analytics", "team-performance", days],
    queryFn: () => api.get<TeamPerformance>("/analytics/team-performance", { days }),
  });
}

export function useSegmentation() {
  return useQuery({
    queryKey: ["analytics", "segmentation"],
    queryFn: () => api.get<SegmentationRow[]>("/analytics/segmentation"),
  });
}

export function useWinLoss(months = 6) {
  return useQuery({
    queryKey: ["analytics", "win-loss", months],
    queryFn: () => api.get<WinLossRow[]>("/analytics/win-loss", { months }),
  });
}

export function usePipelineVelocity(days = 90) {
  return useQuery({
    queryKey: ["analytics", "pipeline-velocity", days],
    queryFn: () => api.get<PipelineVelocity>("/analytics/pipeline-velocity", { days }),
  });
}

export function useCustomerGrowth(months = 12) {
  return useQuery({
    queryKey: ["analytics", "customer-growth", months],
    queryFn: () => api.get<CustomerGrowthPoint[]>("/analytics/customer-growth", { months }),
  });
}

export function useBusinessInsights() {
  return useQuery({
    queryKey: ["analytics", "insights"],
    queryFn: () => api.get<{ insights: BusinessInsight[] }>("/analytics/insights"),
  });
}
