"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import type { DealListItem } from "@/lib/types";
import { cn, formatCompactCurrency, formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/contexts/i18n-context";

export function DealCard({ deal }: { deal: DealListItem }) {
  const router = useRouter();
  const { locale } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && router.push(`/sales/deals/${deal.id}`)}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <p className="text-sm font-semibold text-foreground line-clamp-2">{deal.title}</p>
      {deal.company && <p className="mt-0.5 truncate text-xs text-muted-foreground">{deal.company.name}</p>}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{formatCompactCurrency(deal.value, deal.currency)}</span>
        {deal.owner && <Avatar name={deal.owner.full_name} color={deal.owner.avatar_color} size="xs" />}
      </div>
      {deal.expected_close_date && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-subtle-foreground">
          <CalendarDays className="h-3 w-3" />
          {formatDate(deal.expected_close_date, locale)}
        </div>
      )}
    </div>
  );
}
