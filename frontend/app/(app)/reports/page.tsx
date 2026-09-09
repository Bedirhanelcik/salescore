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

const REPORT_TYPES = ["sales", "customers", "employee-performance", "revenue", "lead-conversion", "pipeline", "activity", "kpi"];

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
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" title={t("reports.startDate")} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" title={t("reports.endDate")} />
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
                  {columns.map((col) => (
                    <th key={col} className="cursor-pointer px-5 py-3 font-medium select-none" onClick={() => toggleSort(col)}>
                      <span className="inline-flex items-center gap-1">
                        {titleCase(col)}
                        {sortBy === col && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/70 last:border-b-0 hover:bg-card-hover">
                    {columns.map((col) => (
                      <td key={col} className="px-5 py-3 text-foreground whitespace-nowrap">
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && (
          <Pagination page={data.page} totalPages={data.total_pages} total={data.total} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}
