"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api-client";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useCreateTask } from "@/lib/hooks/use-tasks";

const schema = z.object({
  title: z.string().min(2, "Required"),
  description: z.string().optional(),
  priority: z.string(),
  due_date: z.string().optional(),
  assignee_id: z.coerce.number().optional(),
});
type FormValues = z.infer<typeof schema>;

export function TaskFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { data: employees } = useEmployees({ page_size: 100 });
  const createTask = useCreateTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createTask.mutateAsync({
        ...values,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
        assignee_id: values.assignee_id || undefined,
      });
      toast.success(t("operations.addTask"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("operations.addTask")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("title")} autoFocus />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div>
          <Label>{t("crm.tabs.notes")}</Label>
          <Textarea rows={2} {...register("description")} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("operations.priority")}</Label>
            <Select {...register("priority")}>
              <option value="low">{t("operations.priorities.low")}</option>
              <option value="medium">{t("operations.priorities.medium")}</option>
              <option value="high">{t("operations.priorities.high")}</option>
              <option value="critical">{t("operations.priorities.critical")}</option>
            </Select>
          </div>
          <div>
            <Label>{t("operations.dueDate")}</Label>
            <Input type="date" {...register("due_date")} />
          </div>
        </div>
        <div>
          <Label>{t("operations.assignee")}</Label>
          <Select {...register("assignee_id")} defaultValue="">
            <option value="">{t("common.none")}</option>
            {employees?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </Select>
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
