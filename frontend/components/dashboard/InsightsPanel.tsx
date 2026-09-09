import { AlertTriangle, CheckCircle2, Info, TrendingUp } from "lucide-react";

import type { BusinessInsight } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  critical: { icon: AlertTriangle, tone: "text-danger bg-danger-subtle" },
  warning: { icon: AlertTriangle, tone: "text-warning bg-warning-subtle" },
  info: { icon: Info, tone: "text-info bg-info-subtle" },
  positive: { icon: CheckCircle2, tone: "text-success bg-success-subtle" },
};

export function InsightsPanel({ insights }: { insights: BusinessInsight[] }) {
  return (
    <div className="divide-y divide-border">
      {insights.map((insight) => {
        const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info;
        const Icon = config.icon;
        return (
          <div key={insight.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", config.tone)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{insight.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InsightsIcon() {
  return <TrendingUp className="h-4 w-4" />;
}
