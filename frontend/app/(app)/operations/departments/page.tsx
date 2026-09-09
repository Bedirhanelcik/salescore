"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Building, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCreateDepartment, useDepartments } from "@/lib/hooks/use-employees";

const schema = z.object({ name: z.string().min(2, "Required"), description: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export default function DepartmentsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await createDepartment.mutateAsync(values);
      toast.success(t("operations.addDepartment"));
      reset();
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <div className="space-y-4">
      {user?.role === "admin" && (
        <div className="flex justify-end">
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            {t("operations.addDepartment")}
          </Button>
        </div>
      )}

      {isLoading || !departments ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <EmptyState icon={Building} title={t("common.noResults")} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                    <Building className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-foreground">{dept.name}</p>
                </div>
                {dept.description && <p className="mt-2 text-xs text-muted-foreground">{dept.description}</p>}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {dept.employee_count} {t("operations.employeeCount")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("operations.addDepartment")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>{t("common.name")}</Label>
            <Input {...register("name")} autoFocus />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <Label>{t("crm.tabs.notes")}</Label>
            <Textarea rows={2} {...register("description")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
