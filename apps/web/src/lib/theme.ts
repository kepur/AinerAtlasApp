export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "ainerspeak_theme";

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function readStoredTheme(): ThemeMode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function resolveTheme(preferred: string | null | undefined, fallback: ThemeMode = "light"): ThemeMode {
  if (preferred === "light" || preferred === "dark") {
    return preferred;
  }
  return fallback;
}
