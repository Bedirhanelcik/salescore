"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Target } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api-client";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useConvertLead, useLead } from "@/lib/hooks/use-leads";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  deal_title: z.string().optional(),
  deal_value: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = Number(params.id);
  const router = useRouter();
  const { t, locale } = useI18n();
  const [convertOpen, setConvertOpen] = useState(false);

  const { data: lead, isLoading } = useLead(leadId);
  const convertLead = useConvertLead(leadId);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { deal_value: 0 },
  });

  const onConvert = async (values: FormValues) => {
    try {
      const deal = await convertLead.mutateAsync(values);
      toast.success(t("crm.leadConverted"));
      setConvertOpen(false);
      router.push(`/sales/deals/${deal.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/crm/leads")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("common.back")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">{lead.company_name}</p>
          </div>
        </div>
        {lead.status !== "converted" ? (
          <Button onClick={() => setConvertOpen(true)}>{t("crm.convertLead")}</Button>
        ) : (
          <Badge tone="success">{t("crm.leadConverted")}</Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label={t("common.email")} value={lead.email} />
          <Field label={t("common.phone")} value={lead.phone} />
          <Field label={t("crm.source")} value={lead.source} />
          <Field label={t("crm.score")} value={String(lead.score)} />
          <Field label={t("common.status")} value={lead.status} />
          <Field label={t("common.owner")} value={lead.owner?.full_name} />
          <Field label={t("common.createdAt")} value={formatDate(lead.created_at, locale)} />
        </CardContent>
      </Card>

      {lead.notes && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground">{t("crm.tabs.notes")}</p>
            <p className="mt-1 text-sm text-foreground">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title={t("crm.convertLead")}>
        <form onSubmit={handleSubmit(onConvert)} className="space-y-4">
          <div>
            <Label>{t("sales.deals")}</Label>
            <Input {...register("deal_title")} placeholder={`${lead.company_name ?? lead.name} - New Business`} />
            <FieldError />
          </div>
          <div>
            <Label>{t("sales.dealValue")}</Label>
            <Input type="number" min={0} {...register("deal_value")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setConvertOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t("crm.convertLead")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium capitalize text-foreground">{value || "—"}</p>
    </div>
  );
}
