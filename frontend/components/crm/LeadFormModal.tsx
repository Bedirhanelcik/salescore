"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCreateLead } from "@/lib/hooks/use-leads";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  company_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string(),
  score: z.coerce.number().min(0).max(100).optional(),
});
type FormValues = z.infer<typeof schema>;

export function LeadFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const createLead = useCreateLead();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "website", score: 50 },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createLead.mutateAsync({ ...values, email: values.email || undefined });
      toast.success(t("crm.addLead"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("crm.addLead")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("name")} autoFocus />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label>{t("common.company")}</Label>
          <Input {...register("company_name")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.email")}</Label>
            <Input {...register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <div>
            <Label>{t("common.phone")}</Label>
            <Input {...register("phone")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("crm.source")}</Label>
            <Select {...register("source")}>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="advertisement">Advertisement</option>
              <option value="email">Email</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>{t("crm.score")}</Label>
            <Input type="number" min={0} max={100} {...register("score")} />
          </div>
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
