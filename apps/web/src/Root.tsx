import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider, isLocaleCode, resolveProfileLocale, useI18n, type LocaleCode } from "./i18n";
import { applyTheme, readStoredTheme, resolveTheme } from "./lib/theme";
import { enabledLocaleCodes, useAppConfigStore } from "./stores/appConfigStore";
import { useAuthStore } from "./stores/authStore";
import "./styles.css";
import "./styles/action-chips.css";
import "./premium.css";
import "./theme-contrast.css";

function LocaleThemeSync() {
  const config = useAppConfigStore((s) => s.config);
  const profile = useAuthStore((s) => s.profile);
  const { setLocale } = useI18n();

  useEffect(() => {
    if (!config) return;
    const preferredLocale = resolveProfileLocale(profile) || config.default_locale;
    if (isLocaleCode(preferredLocale) && config.enabled_locales.includes(preferredLocale)) {
      setLocale(preferredLocale);
    }
    const storedTheme = readStoredTheme();
    const theme = config.allow_user_theme_override
      ? resolveTheme(profile?.ui_theme || storedTheme, config.default_theme)
      : config.default_theme;
    applyTheme(theme);
  }, [config, profile, setLocale]);

  return null;
}

function resolveInitialLocale(
  profileLocale: string | undefined,
  configLocale: string,
  enabled: LocaleCode[]
): LocaleCode {
  const preferred = profileLocale || configLocale;
  if (isLocaleCode(preferred) && enabled.includes(preferred)) {
    return preferred;
  }
  return enabled[0] ?? "zh";
}

export function Root() {
  const config = useAppConfigStore((s) => s.config);
  const loadConfig = useAppConfigStore((s) => s.loadConfig);
  const profile = useAuthStore((s) => s.profile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadConfig().finally(() => setReady(true));
  }, [loadConfig]);

  if (!ready || !config) {
    return (
      <main className="app-shell">
        <section className="phone-frame page-center">Loading…</section>
      </main>
    );
  }

  const enabled = enabledLocaleCodes(config);
  const initialLocale = resolveInitialLocale(
    resolveProfileLocale(profile),
    config.default_locale,
    enabled
  );

  return (
    <I18nProvider initialLocale={initialLocale} enabledLocales={enabled}>
      <LocaleThemeSync />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  );
}
