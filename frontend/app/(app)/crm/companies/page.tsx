"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CompanyFormModal } from "@/components/crm/CompanyFormModal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCompanies } from "@/lib/hooks/use-companies";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<string, "success" | "neutral" | "brand"> = {
  active: "success",
  prospect: "brand",
  inactive: "neutral",
};

export default function CompaniesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useCompanies({
    page,
    page_size: 15,
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground rtl:left-auto rtl:right-3" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("common.search")}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">
            {t("common.status")}: {t("common.all")}
          </option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t("crm.addCompany")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t("crm.noCompanies")}
            description={t("crm.noCompaniesHint")}
            actionLabel={t("crm.addCompany")}
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground rtl:text-right">
                  <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.industry")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.country")}</th>
                  <th className="px-5 py-3 font-medium">{t("crm.revenue")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.owner")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => router.push(`/crm/companies/${company.id}`)}
                    className="cursor-pointer border-b border-border/70 last:border-b-0 hover:bg-card-hover"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">{company.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{company.industry ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{company.country ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {company.annual_revenue ? formatCurrency(company.annual_revenue) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[company.status]}>{company.status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {company.owner && (
                        <Avatar name={company.owner.full_name} color={company.owner.avatar_color} size="xs" />
                      )}
                    </td>
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

      <CompanyFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
