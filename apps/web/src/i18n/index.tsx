import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLocaleCode, LOCALE_CODES, type LocaleCode } from "./localeManifest";
import ar from "./locales/ar";
import bn from "./locales/bn";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import hi from "./locales/hi";
import ja from "./locales/ja";
import ko from "./locales/ko";
import pt from "./locales/pt";
import ru from "./locales/ru";
import sr from "./locales/sr";
import zh from "./locales/zh";

export type { LocaleCode };
export { isLocaleCode, LOCALE_CODES, LOCALE_NATIVE_NAMES } from "./localeManifest";

const bundles: Record<LocaleCode, Record<string, unknown>> = {
  en,
  zh,
  hi,
  es,
  fr,
  ar,
  bn,
  pt,
  ru,
  ja,
  sr,
  ko
};

function lookup(bundle: Record<string, unknown>, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, bundle);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{{${name}}}`
  );
}

type I18nContextValue = {
  locale: LocaleCode;
  enabledLocales: LocaleCode[];
  setLocale: (locale: LocaleCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: LocaleCode;
  enabledLocales?: LocaleCode[];
};

export function I18nProvider({
  children,
  initialLocale = "zh",
  enabledLocales = ["zh", "en"]
}: I18nProviderProps) {
  const allowed = useMemo(
    () => enabledLocales.filter((code): code is LocaleCode => code in bundles),
    [enabledLocales]
  );
  const fallbackLocale = allowed.includes(initialLocale) ? initialLocale : allowed[0] ?? "zh";
  const [locale, setLocaleState] = useState<LocaleCode>(fallbackLocale);

  useEffect(() => {
    if (allowed.includes(initialLocale)) {
      setLocaleState(initialLocale);
      document.documentElement.lang = initialLocale;
      document.documentElement.dir = initialLocale === "ar" ? "rtl" : "ltr";
    }
  }, [initialLocale, allowed]);

  const setLocale = (next: LocaleCode) => {
    if (allowed.includes(next)) {
      setLocaleState(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    }
  };

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    enabledLocales: allowed,
    setLocale,
    t: (key, params) => {
      const raw =
        lookup(bundles[locale], key)
        ?? lookup(bundles.en, key)
        ?? lookup(bundles.zh, key)
        ?? key;
      return interpolate(raw, params);
    }
  }), [allowed, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function resolveProfileLocale(
  profile: { ui_language?: string; native_language?: string } | null | undefined
): string | undefined {
  return profile?.native_language || profile?.ui_language || undefined;
}

export function resolveLocaleCode(
  preferred: string | undefined,
  fallback: string,
  enabled: string[]
): LocaleCode {
  const candidates = [preferred, fallback, "en", "zh"];
  for (const candidate of candidates) {
    if (candidate && isLocaleCode(candidate) && enabled.includes(candidate)) {
      return candidate;
    }
  }
  const first = enabled.find((code): code is LocaleCode => isLocaleCode(code));
  return first ?? "zh";
}
