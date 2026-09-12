import type { LucideIcon } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card-hover border border-border">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <p className="text-sm font-semibold text-danger">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      )}
    </div>
  );
}
