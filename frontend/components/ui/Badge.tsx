import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-card-hover text-muted-foreground border-border",
  brand: "bg-brand-subtle text-brand border-transparent",
  success: "bg-success-subtle text-success border-transparent",
  warning: "bg-warning-subtle text-warning border-transparent",
  danger: "bg-danger-subtle text-danger border-transparent",
  info: "bg-info-subtle text-info border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const stageTone: Record<string, BadgeTone> = {
  lead: "neutral",
  qualified: "info",
  opportunity: "brand",
  proposal: "warning",
  negotiation: "warning",
  won: "success",
  lost: "danger",
};

export function StageBadge({ stage, label }: { stage: string; label: string }) {
  return <Badge tone={stageTone[stage] ?? "neutral"}>{label}</Badge>;
}

const taskStatusTone: Record<string, BadgeTone> = {
  todo: "neutral",
  in_progress: "info",
  completed: "success",
  overdue: "danger",
};

export function TaskStatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={taskStatusTone[status] ?? "neutral"}>{label}</Badge>;
}

const priorityTone: Record<string, BadgeTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export function PriorityBadge({ priority, label }: { priority: string; label: string }) {
  return <Badge tone={priorityTone[priority] ?? "neutral"}>{label}</Badge>;
}
