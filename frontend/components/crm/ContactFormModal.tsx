"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCreateContact } from "@/lib/hooks/use-contacts";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  job_title: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ContactFormModal({
  open,
  onClose,
  companyId,
}: {
  open: boolean;
  onClose: () => void;
  companyId?: number;
}) {
  const { t } = useI18n();
  const createContact = useCreateContact();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await createContact.mutateAsync({ ...values, email: values.email || undefined, company_id: companyId });
      toast.success(t("crm.addContact"));
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("crm.addContact")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.name")}</Label>
            <Input {...register("first_name")} placeholder="First name" autoFocus />
            <FieldError>{errors.first_name?.message}</FieldError>
          </div>
          <div>
            <Label>&nbsp;</Label>
            <Input {...register("last_name")} placeholder="Last name" />
            <FieldError>{errors.last_name?.message}</FieldError>
          </div>
        </div>
        <div>
          <Label>{t("common.email")}</Label>
          <Input {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.phone")}</Label>
            <Input {...register("phone")} />
          </div>
          <div>
            <Label>{t("crm.jobTitle")}</Label>
            <Input {...register("job_title")} />
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
