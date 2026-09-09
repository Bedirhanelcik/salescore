"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useEmployee } from "@/lib/hooks/use-employees";
import { useSalesTargets } from "@/lib/hooks/use-targets";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data: employee, isLoading } = useEmployee(employeeId);
  const { data: targets } = useSalesTargets({ employee_id: employeeId });

  if (isLoading || !employee) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/operations/employees")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("common.back")}
      </button>

      <div className="flex items-center gap-3">
        <Avatar name={employee.full_name} color={employee.avatar_color} size="md" />
        <div>
          <h1 className="text-xl font-bold text-foreground">{employee.full_name}</h1>
          <p className="text-sm text-muted-foreground">{employee.job_title}</p>
        </div>
        <Badge tone="brand" className="ms-2">
          {t(`roles.${employee.role}`)}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label={t("common.email")} value={employee.email} />
          <Field label={t("operations.department")} value={employee.department?.name} />
          <Field label={t("common.status")} value={employee.is_active ? "Active" : "Inactive"} />
          <Field label={t("common.createdAt")} value={formatDate(employee.created_at, locale)} />
        </CardContent>
      </Card>

      {targets && targets.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">{t("sales.targets")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {targets.map((target) => (
              <Card key={target.id}>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-foreground">{target.name}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-bold text-foreground">{formatCurrency(target.actual_amount)}</span>
                    <span className="text-xs text-muted-foreground">/ {formatCurrency(target.target_amount)}</span>
                  </div>
                  <ProgressBar
                    value={target.achievement_pct}
                    className="mt-2"
                    tone={target.achievement_pct >= 100 ? "success" : "brand"}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
