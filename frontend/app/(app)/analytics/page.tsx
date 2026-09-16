"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { CustomerGrowthChart } from "@/components/charts/CustomerGrowthChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { SegmentationChart } from "@/components/charts/SegmentationChart";
import { WinLossChart } from "@/components/charts/WinLossChart";
import { MetricHelp } from "@/components/knowledge/MetricHelp";
import { useI18n } from "@/lib/contexts/i18n-context";
import {
  useCustomerGrowth,
  useFunnel,
  usePipelineVelocity,
  useRevenueTrend,
  useSegmentation,
  useTeamPerformance,
  useWinLoss,
} from "@/lib/hooks/use-analytics";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/utils";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const { data: revenue, isLoading: revenueLoading } = useRevenueTrend(12);
  const { data: funnel, isLoading: funnelLoading } = useFunnel(90);
  const { data: winLoss, isLoading: winLossLoading } = useWinLoss(6);
  const { data: team, isLoading: teamLoading } = useTeamPerformance(30);
  const { data: segmentation, isLoading: segmentationLoading } = useSegmentation();
  const { data: velocity, isLoading: velocityLoading } = usePipelineVelocity(90);
  const { data: customerGrowth, isLoading: customerGrowthLoading } = useCustomerGrowth(12);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <VelocityStat
          label={t("analytics.avgDaysToClose")}
          value={velocity ? `${velocity.average_days_to_close}` : undefined}
          loading={velocityLoading}
        />
        <VelocityStat
          label={t("analytics.avgDealSize")}
          value={velocity ? formatCompactCurrency(velocity.average_deal_size) : undefined}
          loading={velocityLoading}
        />
        <VelocityStat
          label={t("analytics.dealsPerMonth")}
          value={velocity ? `${velocity.deals_per_month}` : undefined}
          loading={velocityLoading}
        />
        <VelocityStat
          label={t("analytics.velocityScore")}
          value={velocity ? formatCompactCurrency(velocity.velocity_score) : undefined}
          loading={velocityLoading}
          termKey="pipeline_velocity"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("analytics.revenueTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading || !revenue ? (
              <Skeleton className="h-[280px] w-full" />
            ) : revenue.points.every((p) => p.actual === 0 && p.target === 0 && p.forecast === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
            ) : (
              <RevenueChart points={revenue.points} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.winLoss")}</CardTitle>
          </CardHeader>
          <CardContent>
            {winLossLoading || !winLoss ? (
              <Skeleton className="h-[260px] w-full" />
            ) : winLoss.every((r) => r.won === 0 && r.lost === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
            ) : (
              <WinLossChart rows={winLoss} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.salesFunnel")}</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelLoading || !funnel ? (
            <Skeleton className="h-56 w-full" />
          ) : funnel.stages.every((s) => s.count === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <FunnelChart stages={funnel.stages} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.segmentation")}</CardTitle>
          </CardHeader>
          <CardContent>
            {segmentationLoading || !segmentation ? (
              <Skeleton className="h-40 w-full" />
            ) : segmentation.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
            ) : (
              <SegmentationChart rows={segmentation} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.customerGrowth")}</CardTitle>
          </CardHeader>
          <CardContent>
            {customerGrowthLoading || !customerGrowth ? (
              <Skeleton className="h-[220px] w-full" />
            ) : customerGrowth.every((p) => p.new_customers === 0 && p.total_customers === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
            ) : (
              <CustomerGrowthChart points={customerGrowth} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("analytics.teamPerformance")}</CardTitle>
            <CardDescription>{t("common.last30Days")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {teamLoading || !team ? (
            <div className="px-5 pb-5">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : team.rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs text-muted-foreground rtl:text-right">
                    <th className="px-5 py-3 font-medium">{t("analytics.employee")}</th>
                    <th className="px-5 py-3 font-medium">{t("analytics.deals")}</th>
                    <th className="px-5 py-3 font-medium">{t("analytics.won")}</th>
                    <th className="px-5 py-3 font-medium">{t("dashboard.kpi.revenue")}</th>
                    <th className="px-5 py-3 font-medium">{t("analytics.winRate")}</th>
                    <th className="px-5 py-3 font-medium w-48">{t("sales.achievement")}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.rows.map((row) => (
                    <tr key={row.employee.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.employee.full_name} color={row.employee.avatar_color} size="xs" />
                          <span className="font-medium text-foreground">{row.employee.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{row.deals_count}</td>
                      <td className="px-5 py-3 text-muted-foreground">{row.won_count}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{formatCurrency(row.revenue)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatPercent(row.win_rate)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={row.achievement_pct}
                            tone={
                              row.achievement_pct >= 100 ? "success" : row.achievement_pct >= 70 ? "brand" : "warning"
                            }
                            className="w-24"
                          />
                          <span className="text-xs text-muted-foreground">{row.achievement_pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VelocityStat({
  label,
  value,
  loading,
  termKey,
}: {
  label: string;
  value?: string;
  loading?: boolean;
  termKey?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {termKey && <MetricHelp termKey={termKey} />}
      </div>
      {loading || value === undefined ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      )}
    </div>
  );
}
