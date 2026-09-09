"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useKnowledgeCategories, useKnowledgeTerms } from "@/lib/hooks/use-knowledge";
import { categoryName, termName, termShortDefinition } from "@/lib/knowledge-i18n";
import { cn } from "@/lib/utils";

export default function KnowledgePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();

  const { data: categories, isLoading: categoriesLoading } = useKnowledgeCategories();
  const { data: terms, isLoading: termsLoading } = useKnowledgeTerms({
    category_id: categoryId,
    search: search || undefined,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("knowledge.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("knowledge.subtitle")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground rtl:left-auto rtl:right-3" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("knowledge.searchPlaceholder")}
          className="max-w-md pl-9 rtl:pl-3 rtl:pr-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryId(undefined)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            categoryId === undefined
              ? "border-brand bg-brand-subtle text-brand"
              : "border-border text-muted-foreground hover:bg-card-hover"
          )}
        >
          {t("knowledge.allCategories")}
        </button>
        {!categoriesLoading &&
          categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                categoryId === cat.id
                  ? "border-brand bg-brand-subtle text-brand"
                  : "border-border text-muted-foreground hover:bg-card-hover"
              )}
            >
              {categoryName(cat, locale)} <span className="opacity-60">({cat.term_count})</span>
            </button>
          ))}
      </div>

      {termsLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !terms || terms.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title={t("knowledge.noTerms")} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((term) => (
            <button
              key={term.key}
              onClick={() => router.push(`/knowledge/${term.key}`)}
              className="rounded-xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-brand/50 hover:bg-card-hover"
            >
              <p className="font-semibold text-foreground">{termName(term, locale)}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                {termShortDefinition(term, locale)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
