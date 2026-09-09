"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmployeeFormModal } from "@/components/operations/EmployeeFormModal";
import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useEmployees } from "@/lib/hooks/use-employees";

export default function EmployeesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useEmployees({ page, page_size: 20, search: search || undefined });

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
        {user?.role === "admin" && (
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            {t("operations.addEmployee")}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Users} title={t("common.noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground rtl:text-right">
                  <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">{t("operations.department")}</th>
                  <th className="px-5 py-3 font-medium">{t("crm.jobTitle")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/operations/employees/${emp.id}`)}
                    className="cursor-pointer border-b border-border/70 last:border-b-0 hover:bg-card-hover"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={emp.full_name} color={emp.avatar_color} size="xs" />
                        <span className="font-medium text-foreground">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{t(`roles.${emp.role}`)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{emp.department?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{emp.job_title ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={emp.is_active ? "success" : "neutral"}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </Badge>
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

      <EmployeeFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
