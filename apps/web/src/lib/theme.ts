export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "ainerspeak_theme";
const USER_CHOICE_KEY = "ainerspeak_theme_user";

export function normalizeTheme(value: string | null | undefined, fallback: ThemeMode = "light"): ThemeMode {
  return value === "light" || value === "dark" ? value : fallback;
}

export function setDocumentTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

/** Persist an explicit user theme choice (Settings). */
export function applyTheme(theme: ThemeMode) {
  setDocumentTheme(theme);
  localStorage.setItem(STORAGE_KEY, theme);
  localStorage.setItem(USER_CHOICE_KEY, "1");
}

export function readStoredTheme(): ThemeMode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function readUserThemeChoice(): ThemeMode | null {
  if (localStorage.getItem(USER_CHOICE_KEY) !== "1") {
    return null;
  }
  return readStoredTheme();
}

export function resolveTheme(preferred: string | null | undefined, fallback: ThemeMode = "light"): ThemeMode {
  return normalizeTheme(preferred, fallback);
}

export function resolveAppTheme(config: {
  default_theme: string;
  allow_user_theme_override: boolean;
}): ThemeMode {
  const adminTheme = normalizeTheme(config.default_theme);
  if (!config.allow_user_theme_override) {
    return adminTheme;
  }
  return readUserThemeChoice() ?? adminTheme;
}
