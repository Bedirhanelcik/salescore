"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Search, X } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { Button } from "@/components/ui/Button";
import { GUIDE_CATEGORIES } from "./guide-content";

export function GuidePanel() {
  const { guideOpen, closeGuide, restartTour } = useOnboarding();
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!guideOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGuide();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [guideOpen, closeGuide]);

  useEffect(() => {
    // Clears the search box for next time the panel opens, not a synchronous state derivation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!guideOpen) setQuery("");
  }, [guideOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GUIDE_CATEGORIES;
    return GUIDE_CATEGORIES.map((category) => ({
      ...category,
      entries: category.entries.filter((entry) => {
        const title = t(`guide.entries.${entry.key}.title`).toLowerCase();
        const body = t(`guide.entries.${entry.key}.body`).toLowerCase();
        return title.includes(q) || body.includes(q);
      }),
    })).filter((category) => category.entries.length > 0);
  }, [query, t]);

  if (!guideOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="guide-panel-title">
      <div className="fixed inset-0 bg-black/40" onClick={closeGuide} />
      <div className="fixed inset-y-0 end-0 flex w-full max-w-sm flex-col border-s border-border bg-card shadow-2xl animate-in">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h2 id="guide-panel-title" className="text-sm font-semibold text-foreground">
            {t("guide.title")}
          </h2>
          <button
            onClick={closeGuide}
            aria-label={t("common.close")}
            className="rounded-md p-1 text-muted-foreground hover:bg-card-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <Button variant="outline" size="sm" className="w-full" onClick={restartTour}>
            <Compass className="h-4 w-4" />
            {t("guide.restartTour")}
          </Button>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("guide.searchPlaceholder")}
              className="h-9 w-full rounded-lg border border-border bg-background ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("guide.noResults")}</p>
          ) : (
            filtered.map((category) => (
              <details
                key={category.key}
                open={query.trim().length > 0}
                className="group border-b border-border/60 px-2 py-1.5 last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-card-hover">
                  {t(`guide.categories.${category.key}`)}
                  <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                </summary>
                <div className="space-y-3 px-2 pb-2 pt-1">
                  {category.entries.map((entry) => (
                    <div key={entry.key}>
                      <p className="text-xs font-semibold text-foreground">{t(`guide.entries.${entry.key}.title`)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t(`guide.entries.${entry.key}.body`)}
                      </p>
                      {entry.hasExample && (
                        <p className="mt-1 rounded-md bg-card-hover px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          {t(`guide.entries.${entry.key}.example`)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
