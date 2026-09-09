"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import en from "@/locales/en/common.json";
import tr from "@/locales/tr/common.json";
import de from "@/locales/de/common.json";
import ar from "@/locales/ar/common.json";

export type Locale = "en" | "tr" | "de" | "ar";

export const LOCALES: { code: Locale; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
];

const DICTIONARIES: Record<Locale, Record<string, unknown>> = { en, tr, de, ar };

const STORAGE_KEY = "salescore_locale";

function resolve(dict: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // See ThemeProvider for why this reads localStorage in an effect rather than a
  // lazy useState initializer: it keeps the server and first client render identical.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && DICTIONARIES[stored]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
      setLocaleState(stored);
    }
  }, []);

  const dir = useMemo<"ltr" | "rtl">(() => (locale === "ar" ? "rtl" : "ltr"), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return resolve(DICTIONARIES[locale], key) ?? resolve(DICTIONARIES.en, key) ?? fallback ?? key;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, dir, setLocale, t }), [locale, dir, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
