"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckSquare, HelpCircle, Loader2, Search, Target, User, UserCircle } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useGlobalSearch } from "@/lib/hooks/use-search";
import type { SearchResultItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  customer: Building2,
  contact: UserCircle,
  lead: Target,
  deal: Target,
  task: CheckSquare,
  employee: User,
  knowledge_term: HelpCircle,
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useI18n();
  const { data, isFetching } = useGlobalSearch(query);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      // Clear the query when the palette closes so it doesn't show stale results next open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const results = data?.results ?? [];

  const grouped = results.reduce<Record<string, SearchResultItem[]>>((acc, item) => {
    acc[item.type] = acc[item.type] ?? [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const goTo = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("common.searchPlaceholder")}</p>
          )}
          {query.trim().length > 0 && results.length === 0 && !isFetching && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
                {type.replace("_", " ")}
              </p>
              {items.map((item) => {
                const Icon = ICONS[item.type] ?? Search;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => goTo(item.url)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-card-hover"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{item.title}</span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
