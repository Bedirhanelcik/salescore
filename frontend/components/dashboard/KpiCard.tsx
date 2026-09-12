import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { MetricHelp } from "@/components/knowledge/MetricHelp";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { KpiMetric } from "@/lib/types";
import { cn, formatCompactCurrency, formatNumber, formatPercent } from "@/lib/utils";

const METRIC_TERM_KEY: Record<string, string> = {
  revenue: "mrr",
  pipeline_value: "sales_pipeline",
  won_deals: "deal",
  conversion_rate: "conversion_rate",
  win_rate: "win_rate",
  avg_deal_size: "deal",
  active_customers: "customer_360",
  sales_target: "forecast",
};

function formatValue(metric: KpiMetric): string {
  if (metric.format === "currency") return formatCompactCurrency(metric.value);
  if (metric.format === "percent") return formatPercent(metric.value);
  return formatNumber(metric.value);
}

/**
 * `isEmpty` is true only when every KPI on the dashboard is zero (see DashboardPage) -
 * i.e. this user/scope has no deals at all yet, not just a metric that legitimately
 * computes to zero (e.g. a real 0% win rate after a lost deal). Only then do we show
 * an explanatory hint instead of the change-vs-last-period badge, so a genuinely empty
 * CRM still reads as a finished product rather than a broken chart.
 */
export function KpiCard({ metric, label, isEmpty }: { metric: KpiMetric; label: string; isEmpty?: boolean }) {
  const { t } = useI18n();
  const isPositive = (metric.change_pct ?? 0) >= 0;
  const termKey = METRIC_TERM_KEY[metric.key];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {termKey && <MetricHelp termKey={termKey} />}
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{formatValue(metric)}</p>
      {isEmpty ? (
        <p className="mt-1.5 text-xs text-subtle-foreground">{t(`dashboard.emptyHint.${metric.key}`)}</p>
      ) : (
        metric.change_pct !== null && (
          <div
            className={cn(
              "mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              isPositive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
            )}
          >
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {formatPercent(Math.abs(metric.change_pct))}
          </div>
        )
      )}
    </div>
  );
}
