"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { DealCard } from "@/components/sales/DealCard";
import { DealFormModal } from "@/components/sales/DealFormModal";
import { PipelineColumn } from "@/components/sales/PipelineColumn";
import { ApiError } from "@/lib/api-client";
import { canTransition } from "@/lib/deal-stages";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useChangeDealStage, usePipeline } from "@/lib/hooks/use-deals";
import type { DealListItem, DealStage, PipelineBoard } from "@/lib/types";

export default function PipelinePage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { data, isLoading } = usePipeline();
  const changeStage = useChangeDealStage();

  const [board, setBoard] = useState<PipelineBoard | null>(null);
  const [activeDeal, setActiveDeal] = useState<DealListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formStage, setFormStage] = useState<DealStage>("lead");

  // `board` is a local, optimistically-mutable copy of the query data (see onDragEnd) -
  // it must re-sync whenever the server data changes (refetch, other tab, etc.).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local optimistic copy from query data, not a derivable value
    if (data) setBoard(data);
  }, [data]);

  const highlightStage = searchParams.get("stage");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const dealsById = useMemo(() => {
    const map = new Map<number, { deal: DealListItem; stage: DealStage }>();
    board?.columns.forEach((col) => col.deals.forEach((d) => map.set(d.id, { deal: d, stage: col.stage })));
    return map;
  }, [board]);

  const onDragStart = (event: DragStartEvent) => {
    const entry = dealsById.get(Number(event.active.id));
    if (entry) setActiveDeal(entry.deal);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const dealId = Number(event.active.id);
    const targetStage = event.over?.id as DealStage | undefined;
    if (!targetStage || !board) return;

    const entry = dealsById.get(dealId);
    if (!entry || entry.stage === targetStage) return;

    if (!canTransition(entry.stage, targetStage)) {
      toast.error(t("common.somethingWentWrong"));
      return;
    }

    const previousBoard = board;
    const nextBoard: PipelineBoard = {
      columns: board.columns.map((col) => {
        if (col.stage === entry.stage) {
          return {
            ...col,
            deals: col.deals.filter((d) => d.id !== dealId),
            count: col.count - 1,
            total_value: col.total_value - entry.deal.value,
          };
        }
        if (col.stage === targetStage) {
          return {
            ...col,
            deals: [{ ...entry.deal, stage: targetStage }, ...col.deals],
            count: col.count + 1,
            total_value: col.total_value + entry.deal.value,
          };
        }
        return col;
      }),
    };
    setBoard(nextBoard);

    changeStage.mutate(
      { id: dealId, stage: targetStage },
      {
        onError: (err) => {
          setBoard(previousBoard);
          toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("sales.pipeline")}</h1>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setFormStage("lead");
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("sales.addDeal")}
        </Button>
      </div>

      {isLoading || !board ? (
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {board.columns.map((col) => (
              <div key={col.stage} className={highlightStage === col.stage ? "ring-2 ring-brand rounded-xl" : ""}>
                <PipelineColumn
                  stage={col.stage}
                  label={col.label}
                  deals={col.deals}
                  totalValue={col.total_value}
                  isValidDropTarget={
                    !activeDeal || canTransition(dealsById.get(activeDeal.id)?.stage ?? col.stage, col.stage)
                  }
                  onAddDeal={() => {
                    setFormStage(col.stage);
                    setFormOpen(true);
                  }}
                />
              </div>
            ))}
          </div>
          <DragOverlay>{activeDeal && <DealCard deal={activeDeal} />}</DragOverlay>
        </DndContext>
      )}

      <DealFormModal open={formOpen} onClose={() => setFormOpen(false)} defaultStage={formStage} />
    </div>
  );
}
