"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  Database,
  FileText,
  Flag,
  Handshake,
  Lightbulb,
  LineChart,
  Target,
  Trophy,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/contexts/i18n-context";

const FAQ_KEYS = [
  "whatIsSalesCore",
  "whatIsCrm",
  "whatIsLead",
  "whatIsDeal",
  "whatIsPipeline",
  "whereNumbersComeFrom",
  "whatIsRevenue",
  "whatIsPipelineValue",
  "whatIsWinRate",
  "whatIsAnalytics",
  "whatIsReports",
  "whatIsInsights",
  "whoIsFor",
  "howSupportsManagement",
];

const SCENARIO_STEPS = [
  { key: "company", icon: Building2 },
  { key: "contact", icon: UserPlus },
  { key: "lead", icon: Flag },
  { key: "opportunity", icon: Target },
  { key: "proposal", icon: FileText },
  { key: "negotiation", icon: Handshake },
  { key: "wonLost", icon: Trophy },
  { key: "analyticsStep", icon: BarChart3 },
  { key: "decisionStep", icon: Lightbulb },
];

const DATA_CHAIN = [
  { key: "data", icon: Database },
  { key: "information", icon: LineChart },
  { key: "insight", icon: Lightbulb },
  { key: "decision", icon: ClipboardCheck },
];

export default function AboutPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">{t("about.intro.title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("about.intro.description")}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("about.faqTitle")}</h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group px-4 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-foreground">
                {t(`about.faq.${key}.question`)}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90">›</span>
              </summary>
              <p className="pb-3.5 text-sm leading-relaxed text-muted-foreground">{t(`about.faq.${key}.answer`)}</p>
            </details>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground">{t("about.scenarioTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("about.scenarioIntro")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SCENARIO_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-subtle-foreground">
                      {index + 1}/{SCENARIO_STEPS.length}
                    </p>
                    <p className="text-sm font-semibold text-foreground">{t(`about.scenario.${step.key}.title`)}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t(`about.scenario.${step.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground">{t("about.dataChain.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("about.dataChain.subtitle")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {DATA_CHAIN.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{t(`about.dataChain.${step.key}.label`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`about.dataChain.${step.key}.example`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm font-semibold text-foreground">{t("about.supportCta.title")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("about.supportCta.description")}</p>
          <Button onClick={() => router.push("/support")}>{t("about.supportCta.button")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
