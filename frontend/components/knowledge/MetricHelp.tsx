"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useKnowledgeTerm } from "@/lib/hooks/use-knowledge";
import { termShortDefinition } from "@/lib/knowledge-i18n";

/**
 * Small "?" affordance shown next to a metric label. Hovering reveals the term's
 * short definition (pulled live from the Knowledge module); clicking navigates to
 * the full glossary entry. This is what ties the CRM/BI surface to the educational
 * Knowledge base described in the product spec.
 */
export function MetricHelp({ termKey }: { termKey: string }) {
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();
  const router = useRouter();
  const { data: term } = useKnowledgeTerm(open ? termKey : undefined);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => router.push(`/knowledge/${termKey}`)}
        className="text-subtle-foreground hover:text-brand transition-colors"
        aria-label="What does this metric mean?"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-card p-3 text-xs text-foreground shadow-xl animate-in rtl:translate-x-1/2">
          {term ? (
            <>
              <span className="mb-1 block font-semibold text-brand">{termShortDefinition(term, locale).split(" — ")[0]}</span>
              <span className="text-muted-foreground">{termShortDefinition(term, locale)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Loading…</span>
          )}
        </span>
      )}
    </span>
  );
}
