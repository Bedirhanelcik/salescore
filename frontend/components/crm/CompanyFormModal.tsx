"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCreateCompany } from "@/lib/hooks/use-companies";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(2, "Required"),
  industry: z.string().optional(),
  size: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  annual_revenue: z.coerce.number().optional(),
  status: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function CompanyFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const createCompany = useCreateCompany();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: { status: "prospect" } });

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { ...values, annual_revenue: values.annual_revenue || undefined };
      await createCompany.mutateAsync(payload);
      toast.success(t("crm.addCompany"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("crm.addCompany")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("name")} autoFocus />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.industry")}</Label>
            <Input {...register("industry")} />
          </div>
          <div>
            <Label>{t("crm.size")}</Label>
            <Select {...register("size")} defaultValue="">
              <option value="">{t("common.none")}</option>
              <option value="self_employed">Self-employed</option>
              <option value="1-50">1-50</option>
              <option value="51-200">51-200</option>
              <option value="201-1000">201-1000</option>
              <option value="1000+">1000+</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.country")}</Label>
            <Input {...register("country")} />
          </div>
          <div>
            <Label>{t("common.website")}</Label>
            <Input {...register("website")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("crm.revenue")}</Label>
            <Input type="number" {...register("annual_revenue")} />
          </div>
          <div>
            <Label>{t("common.status")}</Label>
            <Select {...register("status")}>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
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
