export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "todo_theme_mode";

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function setStoredThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyThemeMode(mode: ThemeMode): "light" | "dark" {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  return resolved;
}

export const THEME_MODE_ORDER: ThemeMode[] = ["system", "light", "dark"];

export function nextThemeMode(current: ThemeMode): ThemeMode {
  const i = THEME_MODE_ORDER.indexOf(current);
  return THEME_MODE_ORDER[(i + 1) % THEME_MODE_ORDER.length];
}

export function themeModeLabel(mode: ThemeMode): string {
  switch (mode) {
    case "system":
      return "Системная тема";
    case "light":
      return "Светлая тема";
    case "dark":
      return "Тёмная тема";
  }
}
