"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";

import { LOCALES, useI18n } from "@/lib/contexts/i18n-context";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-muted-foreground hover:bg-card-hover hover:text-foreground"
      >
        <Globe className="h-[18px] w-[18px]" />
        <span className="text-xs font-semibold uppercase">{locale}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-44 rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in rtl:right-auto rtl:left-0">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-card-hover",
                locale === l.code ? "text-brand font-medium" : "text-foreground"
              )}
            >
              <span>{l.nativeLabel}</span>
              {locale === l.code && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
