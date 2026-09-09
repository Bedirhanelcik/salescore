import type { Locale } from "@/lib/contexts/i18n-context";
import type { KnowledgeCategory, KnowledgeTerm } from "@/lib/types";

export function termName(term: KnowledgeTerm, locale: Locale): string {
  return { en: term.term_en, tr: term.term_tr, de: term.term_de, ar: term.term_ar }[locale];
}

export function termShortDefinition(term: KnowledgeTerm, locale: Locale): string {
  return {
    en: term.short_definition_en,
    tr: term.short_definition_tr,
    de: term.short_definition_de,
    ar: term.short_definition_ar,
  }[locale];
}

export function termDefinition(term: KnowledgeTerm, locale: Locale): string {
  return { en: term.definition_en, tr: term.definition_tr, de: term.definition_de, ar: term.definition_ar }[locale];
}

export function categoryName(category: KnowledgeCategory, locale: Locale): string {
  return { en: category.name_en, tr: category.name_tr, de: category.name_de, ar: category.name_ar }[locale];
}
