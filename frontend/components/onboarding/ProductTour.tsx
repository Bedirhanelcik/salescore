"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { Button } from "@/components/ui/Button";
import { cn, interpolate } from "@/lib/utils";
import { TOUR_STEPS } from "./tour-steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const MARGIN = 16;
const SPOTLIGHT_PAD = 6;

function computePosition(rect: Rect | null, cardWidth: number, cardHeight: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return { top: Math.max(MARGIN, vh / 2 - cardHeight / 2), left: Math.max(MARGIN, vw / 2 - cardWidth / 2) };
  }

  let left = rect.left + rect.width + MARGIN;
  let top = rect.top;

  if (left + cardWidth > vw - MARGIN) {
    left = rect.left - cardWidth - MARGIN;
    if (left < MARGIN) {
      left = Math.min(Math.max(rect.left, MARGIN), vw - cardWidth - MARGIN);
      top = rect.top + rect.height + MARGIN;
      if (top + cardHeight > vh - MARGIN) {
        top = rect.top - cardHeight - MARGIN;
      }
    }
  }

  top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - cardHeight - MARGIN));
  left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - cardWidth - MARGIN));
  return { top, left };
}

function measureTarget(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // A sidebar item hidden behind Tailwind's `hidden lg:flex` (mobile viewport) is still in
  // the DOM but has a zero-size rect - fall back to an un-highlighted, centered tooltip
  // instead of drawing a spotlight around nothing.
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function ProductTour() {
  const { tourActive, stepIndex, totalSteps, nextStep, finishTour, skipTour } = useOnboarding();
  const { t } = useI18n();
  const step = TOUR_STEPS[stepIndex];
  const cardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tourActive) return;
    // Resets the "measured and positioned" flag for the new step, not a synchronous
    // derivation of this render's props/state - the real position arrives asynchronously
    // after scrollIntoView settles (see the timer below) and the layout effect further down.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);

    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const measure = () => setRect(measureTarget(step.target));
    const timer = setTimeout(measure, 280);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [tourActive, stepIndex, step.target]);

  useLayoutEffect(() => {
    if (!tourActive || !cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    setPos(computePosition(rect, cardRect.width, cardRect.height));
    setReady(true);
  }, [rect, tourActive]);

  useEffect(() => {
    if (!tourActive) return;
    nextBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [tourActive, stepIndex, skipTour]);

  if (!tourActive) return null;

  const isLast = stepIndex === totalSteps - 1;

  return (
    <>
      <div className="fixed inset-0 z-[95]" aria-hidden="true">
        {rect ? (
          <div
            className="fixed rounded-xl border-2 border-brand transition-all duration-300 ease-out"
            style={{
              top: rect.top - SPOTLIGHT_PAD,
              left: rect.left - SPOTLIGHT_PAD,
              width: rect.width + SPOTLIGHT_PAD * 2,
              height: rect.height + SPOTLIGHT_PAD * 2,
              boxShadow: "0 0 0 9999px rgba(15, 15, 20, 0.65)",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/65" />
        )}
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className={cn(
          "fixed z-[96] w-[calc(100vw-2rem)] max-w-80 rounded-xl border border-border bg-card p-4 shadow-2xl transition-opacity duration-200",
          ready ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={pos ? { top: pos.top, left: pos.left } : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 id="tour-step-title" className="text-sm font-semibold text-foreground">
            {t(`onboarding.tour.${step.titleKey}.title`)}
          </h3>
          <button
            onClick={skipTour}
            aria-label={t("common.close")}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-card-hover hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {t(`onboarding.tour.${step.descriptionKey}.description`)}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-subtle-foreground">
            {interpolate(t("onboarding.stepOfTemplate"), { current: String(stepIndex + 1), total: String(totalSteps) })}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={skipTour}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {t("onboarding.skipTour")}
            </button>
            <Button ref={nextBtnRef} size="sm" onClick={isLast ? finishTour : nextStep}>
              {isLast ? t("onboarding.startUsing") : t("onboarding.continue")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
