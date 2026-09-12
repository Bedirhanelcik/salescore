"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useAllTickets, useCreateTicket, useMyTickets, useUpdateTicketStatus } from "@/lib/hooks/use-support";
import type { SupportStatus, SupportTicket } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const CATEGORIES = ["general", "account", "crm", "pipeline", "analytics", "reports", "technical", "other"] as const;
const STATUSES: SupportStatus[] = ["open", "in_progress", "resolved", "closed"];

const STATUS_TONE: Record<SupportStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
};

const schema = z.object({
  name: z.string().min(2, "Required"),
  email: z.string().email(),
  subject: z.string().min(4, "Required"),
  category: z.string(),
  message: z.string().min(10, "Please provide a bit more detail (at least 10 characters)."),
});
type FormValues = z.infer<typeof schema>;

export default function SupportPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState("myTickets");
  const createTicket = useCreateTicket();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.full_name ?? "", email: user?.email ?? "", category: "general" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createTicket.mutateAsync(values);
      toast.success(t("support.form.success"));
      reset({ name: values.name, email: values.email, category: "general", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  const tabs = [
    { key: "myTickets", label: t("support.myTickets") },
    ...(user?.role === "admin" ? [{ key: "allTickets", label: t("support.allTickets") }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("support.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("support.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("support.form.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("support.form.name")}</Label>
                <Input {...register("name")} />
                <FieldError>{errors.name?.message}</FieldError>
              </div>
              <div>
                <Label>{t("support.form.email")}</Label>
                <Input type="email" {...register("email")} />
                <FieldError>{errors.email?.message}</FieldError>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
              <div>
                <Label>{t("support.form.subject")}</Label>
                <Input {...register("subject")} />
                <FieldError>{errors.subject?.message}</FieldError>
              </div>
              <div>
                <Label>{t("support.form.category")}</Label>
                <Select {...register("category")}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`support.categories.${c}`)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("support.form.message")}</Label>
              <Textarea rows={5} {...register("message")} />
              <FieldError>{errors.message?.message}</FieldError>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                {isSubmitting ? t("support.form.submitting") : t("support.form.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tabs.length > 1 && <Tabs tabs={tabs} active={tab} onChange={setTab} />}

      {tab === "myTickets" ? <MyTicketsList locale={locale} t={t} /> : <AllTicketsList locale={locale} t={t} />}
    </div>
  );
}

function TicketRow({
  ticket,
  locale,
  t,
  showSubmitter,
  onStatusChange,
}: {
  ticket: SupportTicket;
  locale: string;
  t: (key: string) => string;
  showSubmitter?: boolean;
  onStatusChange?: (status: SupportStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
          <Badge tone="neutral">{t(`support.categories.${ticket.category}`)}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.message}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-subtle-foreground">
          {showSubmitter && ticket.user && (
            <span className="flex items-center gap-1.5">
              <Avatar name={ticket.user.full_name} color={ticket.user.avatar_color} size="xs" />
              {ticket.user.full_name}
            </span>
          )}
          <span>{formatDateTime(ticket.created_at, locale)}</span>
        </div>
      </div>
      {onStatusChange ? (
        <Select
          value={ticket.status}
          onChange={(e) => onStatusChange(e.target.value as SupportStatus)}
          className="w-full sm:w-40"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`support.status.${s}`)}
            </option>
          ))}
        </Select>
      ) : (
        <Badge tone={STATUS_TONE[ticket.status]}>{t(`support.status.${ticket.status}`)}</Badge>
      )}
    </div>
  );
}

function MyTicketsList({ locale, t }: { locale: string; t: (key: string) => string }) {
  const { data, isLoading } = useMyTickets();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("support.myTickets")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t("support.noTickets")} />
        ) : (
          data.items.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} locale={locale} t={t} />)
        )}
      </CardContent>
    </Card>
  );
}

function AllTicketsList({ locale, t }: { locale: string; t: (key: string) => string }) {
  const [status, setStatus] = useState<SupportStatus | "">("");
  const { data, isLoading } = useAllTickets(status || undefined);
  const updateStatus = useUpdateTicketStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("support.allTickets")}</CardTitle>
        <Select value={status} onChange={(e) => setStatus(e.target.value as SupportStatus | "")} className="w-40">
          <option value="">{t("common.all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`support.status.${s}`)}
            </option>
          ))}
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t("support.noTicketsAdmin")} />
        ) : (
          data.items.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              locale={locale}
              t={t}
              showSubmitter
              onStatusChange={(next) => updateStatus.mutate({ id: ticket.id, status: next })}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
