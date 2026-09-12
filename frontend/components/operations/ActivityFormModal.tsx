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
import { useCompanies } from "@/lib/hooks/use-companies";
import { useCreateActivity } from "@/lib/hooks/use-activities";

const schema = z.object({
  title: z.string().min(2, "Required"),
  type: z.string(),
  description: z.string().optional(),
  activity_date: z.string(),
  company_id: z.coerce.number().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ActivityFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { data: companies } = useCompanies({ page_size: 100 });
  const createActivity = useCreateActivity();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "call", activity_date: new Date().toISOString().slice(0, 16) },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createActivity.mutateAsync({
        ...values,
        activity_date: new Date(values.activity_date).toISOString(),
        company_id: values.company_id || undefined,
      });
      toast.success(t("operations.addActivity"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("operations.addActivity")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("title")} autoFocus />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("common.type")}</Label>
            <Select {...register("type")}>
              <option value="call">{t("operations.activityTypes.call")}</option>
              <option value="email">{t("operations.activityTypes.email")}</option>
              <option value="meeting">{t("operations.activityTypes.meeting")}</option>
              <option value="note">{t("operations.activityTypes.note")}</option>
              <option value="follow_up">{t("operations.activityTypes.follow_up")}</option>
              <option value="demo">{t("operations.activityTypes.demo")}</option>
              <option value="proposal">{t("operations.activityTypes.proposal")}</option>
            </Select>
          </div>
          <div>
            <Label>{t("common.date")}</Label>
            <Input type="datetime-local" {...register("activity_date")} />
          </div>
        </div>
        <div>
          <Label>{t("common.company")}</Label>
          <Select {...register("company_id")} defaultValue="">
            <option value="">{t("common.none")}</option>
            {companies?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("crm.tabs.notes")}</Label>
          <Textarea rows={2} {...register("description")} />
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
