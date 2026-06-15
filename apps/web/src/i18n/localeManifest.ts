/** UI locale codes supported by the H5 client. */
export const LOCALE_CODES = [
  "en",
  "zh",
  "hi",
  "es",
  "fr",
  "ar",
  "bn",
  "pt",
  "ru",
  "ja",
  "sr",
  "ko"
] as const;

export type LocaleCode = (typeof LOCALE_CODES)[number];

export const LOCALE_NATIVE_NAMES: Record<LocaleCode, string> = {
  en: "English",
  zh: "简体中文",
  hi: "हिन्दी",
  es: "Español",
  fr: "Français",
  ar: "العربية",
  bn: "বাংলা",
  pt: "Português",
  ru: "Русский",
  ja: "日本語",
  sr: "Srpski",
  ko: "한국어"
};

export function isLocaleCode(value: string): value is LocaleCode {
  return (LOCALE_CODES as readonly string[]).includes(value);
}
