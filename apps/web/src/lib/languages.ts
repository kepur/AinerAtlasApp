import { LOCALE_NATIVE_NAMES, type LocaleCode } from "../i18n";

/** Product default: 10 UI / learning locales including Serbian. */
export const DEFAULT_LANGUAGE_CODES = [
  "en",
  "zh",
  "hi",
  "es",
  "fr",
  "ar",
  "bn",
  "pt",
  "ru",
  "sr",
] as const satisfies readonly LocaleCode[];

export type LanguageOption = { code: string; label: string };

export function buildLanguageOptions(codes: string[]): LanguageOption[] {
  const seen = new Set<string>();
  const out: LanguageOption[] = [];
  for (const raw of codes) {
    const code = raw.toLowerCase().trim().split("-")[0];
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const label =
      (LOCALE_NATIVE_NAMES as Record<string, string>)[code] ?? code.toUpperCase();
    out.push({ code, label });
  }
  return out;
}

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export function masteryIndexFromLevel(level?: string): number {
  const normalized = (level ?? "B1").toUpperCase();
  const idx = CEFR_LEVELS.indexOf(normalized as (typeof CEFR_LEVELS)[number]);
  return idx >= 0 ? idx + 1 : 3;
}

export function levelFromMasteryIndex(index: number): string {
  const clamped = Math.min(Math.max(index, 1), CEFR_LEVELS.length);
  return CEFR_LEVELS[clamped - 1];
}
