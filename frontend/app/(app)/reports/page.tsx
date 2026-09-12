"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/api-client";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useReport } from "@/lib/hooks/use-reports";
import { titleCase } from "@/lib/utils";

const REPORT_TYPES = [
  "sales",
  "customers",
  "employee-performance",
  "revenue",
  "lead-conversion",
  "pipeline",
  "activity",
  "kpi",
];

// Maps a raw backend column key to an i18n key for its header label - reusing an existing
// key wherever one already carries the right meaning, and only adding new `reports.columns.*`
// entries for columns that have no equivalent elsewhere in the app.
const COLUMN_LABEL_KEYS: Record<string, string> = {
  deal: "reports.columns.deal",
  company: "common.company",
  owner: "common.owner",
  stage: "reports.columns.stage",
  value: "common.value",
  probability: "sales.probability",
  expected_close_date: "sales.expectedClose",
  industry: "common.industry",
  country: "common.country",
  status: "common.status",
  total_deals: "crm.totalDeals",
  won_deals: "crm.wonDeals",
  lifetime_value: "crm.lifetimeValue",
  employee: "analytics.employee",
  deals: "analytics.deals",
  won: "analytics.won",
  revenue: "reports.columns.revenue",
  win_rate: "analytics.winRate",
  target: "sales.target",
  achievement_pct: "sales.achievement",
  period: "reports.columns.period",
  actual: "sales.actual",
  forecast: "sales.forecast",
  previous_period: "reports.columns.previousPeriod",
  lead: "reports.columns.lead",
  source: "crm.source",
  score: "crm.score",
  converted: "crm.leadConverted",
  days_in_pipeline: "reports.columns.daysInPipeline",
  title: "common.name",
  type: "common.type",
  date: "common.date",
  metric: "reports.columns.metric",
  change_pct: "reports.columns.changePct",
  format: "reports.columns.format",
};

// Enum-valued columns whose raw stored value (e.g. "won", "active") needs translation - keyed
// by report type first because the same column name means a different taxonomy in each report
// (e.g. "status" is a company status in `customers` but a lead status in `lead-conversion`).
const ENUM_COLUMNS: Record<string, Record<string, string>> = {
  sales: { stage: "sales.stages" },
  pipeline: { stage: "sales.stages" },
  customers: { status: "crm.companyStatus" },
  "lead-conversion": { status: "crm.leadStatus", source: "crm.leadSource" },
  activity: { status: "operations.activityStatus", type: "operations.activityTypes" },
  kpi: { format: "reports.formatTypes" },
};

export default function ReportsPage() {
  const { t } = useI18n();
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useReport(reportType, {
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    page_size: 15,
  });

  const columns = useMemo(() => (data?.items[0] ? Object.keys(data.items[0]) : []), [data]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const exportCsv = async () => {
    try {
      await downloadCsv(
        `/reports/${reportType}`,
        { start_date: startDate || "", end_date: endDate || "" },
        `${reportType}-report.csv`
      );
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={reportType}
          onChange={(e) => {
            setReportType(e.target.value);
            setPage(1);
            setSortBy(undefined);
          }}
          className="w-56"
        >
          {REPORT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`reports.types.${type}`)}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
          title={t("reports.startDate")}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
          title={t("reports.endDate")}
        />
        <Button variant="outline" size="sm" onClick={exportCsv} className="ms-auto">
          <Download className="h-4 w-4" />
          {t("common.exportCsv")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t("reports.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground rtl:text-right">
                  {columns.map((col) => {
                    const labelKey = COLUMN_LABEL_KEYS[col];
                    return (
                      <th
                        key={col}
                        className="cursor-pointer px-5 py-3 font-medium select-none"
                        onClick={() => toggleSort(col)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {labelKey ? t(labelKey) : titleCase(col)}
                          {sortBy === col &&
                            (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/70 last:border-b-0 hover:bg-card-hover">
                    {columns.map((col) => (
                      <td key={col} className="px-5 py-3 text-foreground whitespace-nowrap">
                        {formatCell(row[col], col, reportType, t)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            total={data.total}
            pageSize={data.page_size}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}

function formatCell(
  value: unknown,
  col: string,
  reportType: string,
  t: (key: string, fallback?: string) => string
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  const enumNamespace = ENUM_COLUMNS[reportType]?.[col];
  if (enumNamespace) return t(`${enumNamespace}.${value}`, String(value));
  return String(value);
}
