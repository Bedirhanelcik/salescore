import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const pct = Math.max(0, Math.min(100, value));
  const toneClass = { brand: "bg-brand", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-border/60", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", toneClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}
