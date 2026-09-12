"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";

export function OnboardingWelcome() {
  const { showWelcome, continueFromWelcome, skipWelcome } = useOnboarding();
  const { t } = useI18n();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showWelcome) return;
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipWelcome();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showWelcome, skipWelcome]);

  if (!showWelcome) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] animate-in"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-2xl animate-in">
        <button
          onClick={skipWelcome}
          aria-label={t("common.close")}
          className="absolute end-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-card-hover hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div>
            <h2 id="onboarding-welcome-title" className="text-lg font-bold text-foreground">
              {t("onboarding.welcomeTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("onboarding.welcomeDescription")}</p>
          </div>
          <p className="text-sm font-semibold text-brand">{t("onboarding.welcomeTourPrompt")}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button ref={continueRef} onClick={continueFromWelcome} size="lg" className="w-full">
            {t("onboarding.continue")}
          </Button>
          <button
            onClick={skipWelcome}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            {t("onboarding.skipForNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
