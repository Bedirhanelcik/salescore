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
import { useCompanies } from "@/lib/hooks/use-companies";
import { useCreateDeal } from "@/lib/hooks/use-deals";
import type { DealStage } from "@/lib/types";

const schema = z.object({
  title: z.string().min(2, "Required"),
  company_id: z.coerce.number().optional(),
  value: z.coerce.number().min(0),
  expected_close_date: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function DealFormModal({
  open,
  onClose,
  defaultStage = "lead",
}: {
  open: boolean;
  onClose: () => void;
  defaultStage?: DealStage;
}) {
  const { t } = useI18n();
  const createDeal = useCreateDeal();
  const { data: companies } = useCompanies({ page_size: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: 0 },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createDeal.mutateAsync({ ...values, stage: defaultStage, company_id: values.company_id || undefined });
      toast.success(t("sales.addDeal"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("sales.addDeal")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{t("common.name")}</Label>
          <Input {...register("title")} autoFocus />
          <FieldError>{errors.title?.message}</FieldError>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("sales.dealValue")}</Label>
            <Input type="number" min={0} {...register("value")} />
          </div>
          <div>
            <Label>{t("sales.expectedClose")}</Label>
            <Input type="date" {...register("expected_close_date")} />
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
