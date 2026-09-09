"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Globe, MapPin } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { StageBadge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useCompany, useCustomer360 } from "@/lib/hooks/use-companies";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useDeals } from "@/lib/hooks/use-deals";
import { useActivities } from "@/lib/hooks/use-activities";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);
  const router = useRouter();
  const { t, locale } = useI18n();
  const [tab, setTab] = useState("overview");

  const { data: company, isLoading } = useCompany(companyId);
  const { data: c360 } = useCustomer360(companyId);
  const { data: contacts } = useContacts({ company_id: companyId, page_size: 50 });
  const { data: deals } = useDeals({ company_id: companyId, page_size: 50 });
  const { data: activities } = useActivities({ company_id: companyId, page_size: 50 });

  if (isLoading || !company) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: t("crm.tabs.overview") },
    { key: "contacts", label: t("crm.tabs.contacts"), count: contacts?.total },
    { key: "deals", label: t("crm.tabs.deals"), count: deals?.total },
    { key: "activities", label: t("crm.tabs.activities"), count: activities?.total },
  ];

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/crm/companies")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("common.back")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-brand">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {company.industry && <span>{company.industry}</span>}
              {company.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {company.country}
                </span>
              )}
              {company.website && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {company.website}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={company.status === "active" ? "success" : company.status === "prospect" ? "brand" : "neutral"}>
            {company.status}
          </Badge>
          {company.owner && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar name={company.owner.full_name} color={company.owner.avatar_color} size="xs" />
              {company.owner.full_name}
            </div>
          )}
        </div>
      </div>

      {c360 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label={t("crm.customerSince")}
            value={c360.customer_since ? formatDate(c360.customer_since, locale) : "—"}
          />
          <StatCard label={t("crm.lifetimeValue")} value={formatCurrency(c360.lifetime_value)} highlight />
          <StatCard label={t("crm.totalDeals")} value={String(c360.total_deals)} />
          <StatCard label={t("crm.wonDeals")} value={String(c360.won_deals)} tone="success" />
          <StatCard label={t("crm.openDeals")} value={String(c360.open_deals)} tone="info" />
          <StatCard label={t("crm.lostDeals")} value={String(c360.lost_deals)} />
        </div>
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <Card>
          <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label={t("common.industry")} value={company.industry} />
            <Field label={t("crm.size")} value={company.size} />
            <Field label={t("common.country")} value={company.country} />
            <Field label={t("common.website")} value={company.website} />
            <Field
              label={t("crm.revenue")}
              value={company.annual_revenue ? formatCurrency(company.annual_revenue) : undefined}
            />
            <Field label={t("common.createdAt")} value={formatDate(company.created_at, locale)} />
          </CardContent>
        </Card>
      )}

      {tab === "contacts" && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            {!contacts || contacts.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("crm.noContacts")}</p>
            ) : (
              contacts.items.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.job_title}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "deals" && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            {!deals || deals.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("sales.noDeals")}</p>
            ) : (
              deals.items.map((d) => (
                <button
                  key={d.id}
                  onClick={() => router.push(`/sales/deals/${d.id}`)}
                  className="flex w-full items-center justify-between border-b border-border/60 pb-3 pt-1 text-left last:border-0 last:pb-0 hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(d.value)}</p>
                  </div>
                  <StageBadge stage={d.stage} label={t(`sales.stages.${d.stage}`)} />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "activities" && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            {!activities || activities.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("operations.noActivities")}</p>
            ) : (
              activities.items.map((a) => (
                <div key={a.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(a.activity_date, locale)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`operations.activityTypes.${a.type}`)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone?: "success" | "info";
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 text-lg font-bold " +
          (highlight
            ? "text-brand"
            : tone === "success"
              ? "text-success"
              : tone === "info"
                ? "text-info"
                : "text-foreground")
        }
      >
        {value}
      </p>
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
