"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const MIN_VISIBLE_MS = 2200;
const FADE_MS = 400;

/**
 * One-time animated brand intro for application startup. Renders as an
 * overlay on top of `children` and stays up for at least `MIN_VISIBLE_MS`
 * *and* until session restore (`useAuth().isLoading`) has resolved,
 * whichever is longer - so the real route underneath never gets a chance to
 * flash the wrong content (e.g. the login form for an already-signed-in
 * session) before this fades away.
 *
 * This must be mounted once, inside `AuthProvider`, as part of the app's
 * root layout (see `providers.tsx`). Next.js keeps that root layout mounted
 * across every client-side route transition for the lifetime of a page
 * load, so the intro naturally never replays when navigating within the
 * app - only on an actual hard load/refresh, which is what "startup" means.
 */
export function AppIntro({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { t } = useI18n();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = minTimeElapsed && !isLoading;

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <>
      {children}
      {mounted && (
        <div
          aria-hidden={ready}
          className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background transition-opacity duration-[400ms] ease-out",
            ready ? "pointer-events-none opacity-0" : "opacity-100"
          )}
        >
          <Logo size="lg" className="[animation:introPop_0.6s_ease-out]" />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-xl font-bold tracking-tight text-foreground [animation:introFade_0.6s_ease-out_0.15s_both]">
              {t("app.name")}
            </span>
            <span className="text-xs font-medium tracking-wide text-muted-foreground [animation:introFade_0.6s_ease-out_0.3s_both]">
              {t("app.introTagline")}
            </span>
          </div>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-border [animation:introFade_0.6s_ease-out_0.3s_both]">
            <div className="h-full w-1/3 rounded-full bg-brand [animation:introBar_1.1s_ease-in-out_infinite]" />
          </div>
        </div>
      )}
    </>
  );
}
