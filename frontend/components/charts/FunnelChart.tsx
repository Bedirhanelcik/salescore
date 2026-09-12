"use client";

import { useRouter } from "next/navigation";

import type { FunnelStage } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const STAGE_COLOR: Record<string, string> = {
  lead: "var(--color-subtle-foreground)",
  qualified: "var(--color-info)",
  opportunity: "var(--color-brand)",
  proposal: "var(--color-warning)",
  negotiation: "var(--color-warning)",
  won: "var(--color-success)",
  lost: "var(--color-danger)",
};

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const router = useRouter();
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2.5">
      {stages.map((stage) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 6 : 0);
        return (
          <button
            key={stage.stage}
            onClick={() => router.push(`/sales/pipeline?stage=${stage.stage}`)}
            className="group flex w-full items-center gap-3 rounded-lg px-1 py-1 text-start hover:bg-card-hover"
          >
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{stage.label}</span>
            <span className="relative h-7 flex-1 overflow-hidden rounded-md bg-border/40">
              <span
                className="absolute inset-y-0 left-0 rounded-md transition-all duration-500 rtl:right-0 rtl:left-auto"
                style={{ width: `${widthPct}%`, backgroundColor: STAGE_COLOR[stage.stage] }}
              />
              <span className="relative z-10 flex h-full items-center px-2.5 text-xs font-semibold text-white mix-blend-normal">
                {stage.count > 0 && widthPct > 18 ? formatNumber(stage.count) : ""}
              </span>
            </span>
            <span className="w-16 shrink-0 text-right text-xs font-semibold text-foreground rtl:text-left">
              {formatNumber(stage.count)}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block rtl:text-left">
              {formatCurrency(stage.value)}
            </span>
            <span className="hidden w-14 shrink-0 text-right text-xs font-medium text-muted-foreground sm:block rtl:text-left">
              {formatPercent(stage.conversion_rate)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
