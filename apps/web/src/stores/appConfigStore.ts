import { create } from "zustand";
import { apiRequest } from "../api";
import { isLocaleCode, type LocaleCode } from "../i18n";
import { DEFAULT_LANGUAGE_CODES } from "../lib/languages";

export type LocaleInfo = {
  code: string;
  name: string;
  native_name: string;
};

export type AppConfig = {
  default_theme: "dark" | "light";
  default_locale: string;
  enabled_locales: string[];
  locales: LocaleInfo[];
  allow_user_theme_override: boolean;
  allow_user_locale_override: boolean;
};

type AppConfigState = {
  config: AppConfig | null;
  loaded: boolean;
  loadConfig: () => Promise<AppConfig>;
};

export const useAppConfigStore = create<AppConfigState>((set) => ({
  config: null,
  loaded: false,
  loadConfig: async () => {
    const config = await apiRequest<AppConfig>("/api/config/app");
    set({ config, loaded: true });
    return config;
  }
}));

export function enabledLocaleCodes(config: AppConfig | null): LocaleCode[] {
  if (!config) return [...DEFAULT_LANGUAGE_CODES];
  const enabled = config.enabled_locales.filter((code): code is LocaleCode => isLocaleCode(code));
  return enabled.length ? enabled : [...DEFAULT_LANGUAGE_CODES];
}
