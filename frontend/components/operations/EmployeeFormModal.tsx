"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api-client";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCreateEmployee, useDepartments } from "@/lib/hooks/use-employees";

const schema = z.object({
  full_name: z.string().min(2, "Required"),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  role: z.string(),
  job_title: z.string().optional(),
  department_id: z.coerce.number().optional(),
});
type FormValues = z.infer<typeof schema>;

export function EmployeeFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { data: departments } = useDepartments();
  const createEmployee = useCreateEmployee();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "sales_rep" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createEmployee.mutateAsync({ ...values, department_id: values.department_id || undefined });
      toast.success(t("operations.addEmployee"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("operations.addEmployee")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("full_name")} autoFocus />
          <FieldError>{errors.full_name?.message}</FieldError>
        </div>
        <div>
          <Label>{t("common.email")}</Label>
          <Input type="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label>{t("auth.password")}</Label>
          <Input type="password" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Role</Label>
            <Select {...register("role")}>
              <option value="admin">{t("roles.admin")}</option>
              <option value="manager">{t("roles.manager")}</option>
              <option value="sales_rep">{t("roles.sales_rep")}</option>
              <option value="analyst">{t("roles.analyst")}</option>
              <option value="viewer">{t("roles.viewer")}</option>
            </Select>
          </div>
          <div>
            <Label>{t("operations.department")}</Label>
            <Select {...register("department_id")} defaultValue="">
              <option value="">{t("common.none")}</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>{t("crm.jobTitle")}</Label>
          <Input {...register("job_title")} />
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
