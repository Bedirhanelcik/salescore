"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import type { DealListItem, DealStage } from "@/lib/types";
import { cn, formatCompactCurrency } from "@/lib/utils";
import { DealCard } from "./DealCard";

export function PipelineColumn({
  stage,
  label,
  deals,
  totalValue,
  isValidDropTarget,
  onAddDeal,
}: {
  stage: DealStage;
  label: string;
  deals: DealListItem[];
  totalValue: number;
  isValidDropTarget: boolean;
  onAddDeal: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const { t } = useI18n();

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card-hover/40">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">
            {deals.length} · {formatCompactCurrency(totalValue)}
          </p>
        </div>
        {stage !== "won" && stage !== "lost" && (
          <button
            onClick={onAddDeal}
            aria-label={t("sales.addDeal")}
            className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto rounded-b-xl p-2 min-h-[120px] transition-colors",
          isOver && isValidDropTarget && "bg-brand-subtle/50 ring-2 ring-inset ring-brand/40",
          isOver && !isValidDropTarget && "bg-danger-subtle/50 ring-2 ring-inset ring-danger/40"
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
