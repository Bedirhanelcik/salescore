"use client";

import Link from "next/link";
import { CheckSquare } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { TaskStatusBadge } from "@/components/ui/Badge";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useBusinessInsights, useFunnel, useKpis, useRevenueTrend } from "@/lib/hooks/use-analytics";
import { useTasks } from "@/lib/hooks/use-tasks";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { data: kpis, isLoading: kpisLoading } = useKpis(30);
  const { data: funnel, isLoading: funnelLoading } = useFunnel(90);
  const { data: revenue, isLoading: revenueLoading } = useRevenueTrend(12);
  const { data: insights, isLoading: insightsLoading } = useBusinessInsights();
  const { data: myTasks } = useTasks({ mine_only: true, page_size: 5, page: 1 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {t("dashboard.title")}
          {user && <span className="font-normal text-muted-foreground"> · {user.full_name}</span>}
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpisLoading || !kpis
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          : kpis.metrics.map((metric) => (
              <KpiCard key={metric.key} metric={metric} label={t(`dashboard.kpi.${metric.key}`)} />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t("dashboard.revenueTrend")}</CardTitle>
              <CardDescription>{t("common.last90Days")} · {t("common.thisYear")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {revenueLoading || !revenue ? <Skeleton className="h-[300px] w-full" /> : <RevenueChart points={revenue.points} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.businessInsights")}</CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading || !insights ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <InsightsPanel insights={insights.insights} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t("dashboard.funnel")}</CardTitle>
              <CardDescription>{t("common.last90Days")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {funnelLoading || !funnel ? (
              <div className="space-y-2.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : (
              <FunnelChart stages={funnel.stages} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.myTasks")}</CardTitle>
            <Link href="/operations/tasks" className="text-xs font-medium text-brand hover:underline">
              {t("common.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {!myTasks || myTasks.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("operations.noTasks")}</p>
            ) : (
              <div className="space-y-3">
                {myTasks.items.map((task) => (
                  <div key={task.id} className="flex items-start gap-2.5">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <TaskStatusBadge status={task.status} label={t(`operations.taskStatus.${task.status}`)} />
                        {task.due_date && (
                          <span className="text-[11px] text-muted-foreground">{formatDate(task.due_date, locale)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
