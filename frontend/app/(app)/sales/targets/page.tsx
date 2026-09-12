"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Target } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError, Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useCreateSalesTarget, useSalesTargets } from "@/lib/hooks/use-targets";
import { formatCurrency, formatDate } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Required"),
  period: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  target_amount: z.coerce.number().positive(),
  employee_id: z.coerce.number().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function SalesTargetsPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: targets, isLoading } = useSalesTargets();
  const canManage = user && (user.role === "admin" || user.role === "manager");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{t("sales.targets")}</h2>
        {canManage && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("common.createNew")}
          </Button>
        )}
      </div>

      {isLoading || !targets ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title={t("common.noResults")} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => (
            <Card key={target.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{target.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(target.period_start, locale)} – {formatDate(target.period_end, locale)}
                    </p>
                  </div>
                  {target.employee && (
                    <Avatar name={target.employee.full_name} color={target.employee.avatar_color} size="sm" />
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-foreground">{formatCurrency(target.actual_amount)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("sales.target")}: {formatCurrency(target.target_amount)}
                  </span>
                </div>
                <ProgressBar
                  value={target.achievement_pct}
                  className="mt-2"
                  tone={target.achievement_pct >= 100 ? "success" : target.achievement_pct >= 70 ? "brand" : "warning"}
                />
                <div className="mt-2 flex items-center justify-between">
                  <Badge
                    tone={
                      target.achievement_pct >= 100 ? "success" : target.achievement_pct >= 70 ? "brand" : "warning"
                    }
                  >
                    {target.achievement_pct.toFixed(0)}%
                  </Badge>
                  {target.department && <span className="text-xs text-muted-foreground">{target.department.name}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TargetFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function TargetFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { data: employees } = useEmployees({ page_size: 100 });
  const createTarget = useCreateSalesTarget();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { period: "monthly" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createTarget.mutateAsync({ ...values, employee_id: values.employee_id || undefined });
      toast.success(t("common.create"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("sales.targets")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("name")} autoFocus />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label>{t("operations.assignee")}</Label>
          <Select {...register("employee_id")} defaultValue="">
            <option value="">
              {t("common.none")} ({t("operations.department")}-wide)
            </option>
            {employees?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("reports.startDate")}</Label>
            <Input type="date" {...register("period_start")} />
          </div>
          <div>
            <Label>{t("reports.endDate")}</Label>
            <Input type="date" {...register("period_end")} />
          </div>
        </div>
        <div>
          <Label>{t("sales.target")}</Label>
          <Input type="number" min={1} {...register("target_amount")} />
          <FieldError>{errors.target_amount?.message}</FieldError>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {t("common.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
