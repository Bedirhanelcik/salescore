"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useKnowledgeCategories, useKnowledgeTerm } from "@/lib/hooks/use-knowledge";
import { categoryName, termDefinition, termName } from "@/lib/knowledge-i18n";

export default function KnowledgeTermPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data: term, isLoading, isError } = useKnowledgeTerm(params.key);
  const { data: categories } = useKnowledgeCategories();
  const category = categories?.find((c) => c.id === term?.category_id);

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/knowledge")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("common.back")}
      </button>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError || !term ? (
        <Card>
          <EmptyState icon={BookOpen} title={t("knowledge.noTerms")} />
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {category && <Badge tone="brand">{categoryName(category, locale)}</Badge>}
            <h1 className="mt-3 text-2xl font-bold text-foreground">{termName(term, locale)}</h1>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {termDefinition(term, locale)}
            </p>
            {term.example && (
              <div className="mt-5 rounded-lg border border-border bg-card-hover p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">Example</p>
                <p className="mt-1 text-sm text-foreground">{term.example}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
