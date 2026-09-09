import type { DealStage } from "@/lib/types";

export const DEAL_STAGES: DealStage[] = ["lead", "qualified", "opportunity", "proposal", "negotiation", "won", "lost"];

// Mirrors backend app/models/enums.py DEAL_STAGE_TRANSITIONS - kept in sync so the
// kanban board can grey out invalid drop targets before the server ever sees the request.
export const DEAL_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  lead: ["qualified", "lost"],
  qualified: ["lead", "opportunity", "lost"],
  opportunity: ["qualified", "proposal", "lost"],
  proposal: ["opportunity", "negotiation", "lost"],
  negotiation: ["proposal", "won", "lost"],
  won: [],
  lost: [],
};

export function canTransition(from: DealStage, to: DealStage): boolean {
  if (from === to) return true;
  return DEAL_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
}
