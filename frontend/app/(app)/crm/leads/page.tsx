"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Target } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { LeadFormModal } from "@/components/crm/LeadFormModal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useLeads } from "@/lib/hooks/use-leads";

const STATUS_TONE: Record<string, "neutral" | "info" | "brand" | "danger" | "success"> = {
  new: "neutral",
  contacted: "info",
  qualified: "brand",
  unqualified: "danger",
  converted: "success",
};

export default function LeadsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useLeads({ page, page_size: 15, search: search || undefined, status: status || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground rtl:left-auto rtl:right-3" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("common.search")} className="pl-9 rtl:pl-3 rtl:pr-9" />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">{t("common.status")}: {t("common.all")}</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
          <option value="converted">Converted</option>
        </Select>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t("crm.addLead")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Target} title={t("crm.noLeads")} description={t("crm.noLeadsHint")} actionLabel={t("crm.addLead")} onAction={() => setModalOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground rtl:text-right">
                  <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.company")}</th>
                  <th className="px-5 py-3 font-medium">{t("crm.source")}</th>
                  <th className="px-5 py-3 font-medium">{t("crm.score")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    className="cursor-pointer border-b border-border/70 last:border-b-0 hover:bg-card-hover"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{lead.company_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize">{lead.source}</td>
                    <td className="px-5 py-3 text-muted-foreground">{lead.score}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
                    </td>
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

      <LeadFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
