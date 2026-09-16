"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, CheckCircle2, Circle, XCircle } from "lucide-react";

import { StageBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/EmptyState";
import { Label, Textarea } from "@/components/ui/Input";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api-client";
import { DEAL_STAGE_TRANSITIONS } from "@/lib/deal-stages";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useActivities } from "@/lib/hooks/use-activities";
import { useChangeDealStage, useDeal, useDealHistory, useDeleteDeal } from "@/lib/hooks/use-deals";
import type { DealStage } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const dealId = Number(params.id);
  const router = useRouter();
  const { t, locale } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const { data: deal, isLoading, isError, refetch } = useDeal(dealId);
  const { data: history } = useDealHistory(dealId);
  const { data: activities } = useActivities({ deal_id: dealId, page_size: 20 });
  const changeStage = useChangeDealStage();
  const deleteDeal = useDeleteDeal();

  if (isError) {
    return <ErrorState message={t("common.somethingWentWrong")} onRetry={refetch} />;
  }

  if (isLoading || !deal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const nextStages = DEAL_STAGE_TRANSITIONS[deal.stage] ?? [];

  const handleStageChange = (stage: DealStage) => {
    if (stage === "lost") {
      setLostReasonOpen(true);
      return;
    }
    changeStage.mutate(
      { id: dealId, stage },
      {
        onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong")),
      }
    );
  };

  const confirmLost = () => {
    changeStage.mutate(
      { id: dealId, stage: "lost", lost_reason: lostReason || undefined },
      {
        onSuccess: () => setLostReasonOpen(false),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong")),
      }
    );
  };

  const handleDelete = () => {
    deleteDeal.mutate(dealId, {
      onSuccess: () => {
        toast.success(t("common.delete"));
        router.push("/sales/pipeline");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong")),
    });
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("common.back")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{deal.title}</h1>
            {deal.company ? (
              <Link href={`/crm/companies/${deal.company.id}`} className="text-sm text-brand hover:underline">
                {deal.company.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StageBadge stage={deal.stage} label={t(`sales.stages.${deal.stage}`)} />
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            {t("common.delete")}
          </Button>
        </div>
      </div>

      {nextStages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <span className="text-xs font-medium text-muted-foreground">{t("sales.stageHistory")}:</span>
          {nextStages.map((stage) => (
            <Button
              key={stage}
              size="sm"
              variant={stage === "lost" ? "outline" : "secondary"}
              onClick={() => handleStageChange(stage)}
              isLoading={changeStage.isPending}
            >
              → {t(`sales.stages.${stage}`)}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("common.company")}</p>
              {deal.company ? (
                <Link
                  href={`/crm/companies/${deal.company.id}`}
                  className="mt-0.5 block font-medium text-brand hover:underline"
                >
                  {deal.company.name}
                </Link>
              ) : (
                <p className="mt-0.5 font-medium text-foreground">—</p>
              )}
            </div>
            <Field label={t("sales.dealValue")} value={formatCurrency(deal.value, deal.currency)} />
            <Field label={t("sales.probability")} value={`${deal.probability}%`} />
            <Field
              label={t("sales.expectedClose")}
              value={deal.expected_close_date ? formatDate(deal.expected_close_date, locale) : undefined}
            />
            <Field
              label={t("sales.actualClose")}
              value={deal.actual_close_date ? formatDate(deal.actual_close_date, locale) : undefined}
            />
            <Field label={t("common.owner")} value={deal.owner?.full_name} />
            {deal.lost_reason && <Field label={t("sales.lostReason")} value={deal.lost_reason} />}
            <Field label={t("common.createdAt")} value={formatDate(deal.created_at, locale)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("sales.timeline")}
            </p>
            <div className="space-y-4">
              {history?.map((h, idx) => (
                <div key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {idx !== history.length - 1 && (
                    <span className="absolute left-[9px] top-5 h-full w-px bg-border rtl:left-auto rtl:right-[9px]" />
                  )}
                  <span className="z-10 mt-0.5">
                    {h.to_stage === "won" ? (
                      <CheckCircle2 className="h-[18px] w-[18px] text-success" />
                    ) : h.to_stage === "lost" ? (
                      <XCircle className="h-[18px] w-[18px] text-danger" />
                    ) : (
                      <Circle className="h-[18px] w-[18px] text-brand" fill="var(--color-brand-subtle)" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t(`sales.stages.${h.to_stage}`)}</p>
                    {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                    <p className="mt-0.5 text-[11px] text-subtle-foreground">
                      {formatDateTime(h.changed_at, locale)} {h.changed_by && `· ${h.changed_by.full_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("crm.tabs.activities")}
            </p>
            {!activities || activities.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("operations.noActivities")}</p>
            ) : (
              <div className="space-y-3">
                {activities.items.map((a) => (
                  <div key={a.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(a.activity_date, locale)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t(`operations.activityTypes.${a.type}`)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("common.delete")}
        description={t("common.confirmDelete")}
        confirmLabel={t("common.delete")}
        isLoading={deleteDeal.isPending}
      />

      <Modal open={lostReasonOpen} onClose={() => setLostReasonOpen(false)} title={t("sales.lostReason")} size="sm">
        <Label>{t("sales.lostReason")}</Label>
        <Textarea rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLostReasonOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={confirmLost} isLoading={changeStage.isPending}>
            {t("common.confirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
