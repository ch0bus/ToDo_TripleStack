const API_BASE_OVERRIDE_KEY = "todo_api_base_override";

/** Пустая строка = использовать Vite proxy (/api). */
export function getApiBaseOverride(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_BASE_OVERRIDE_KEY) ?? "";
}

export function setApiBaseOverride(value: string): void {
  const trimmed = value.trim();
  if (trimmed) {
    localStorage.setItem(API_BASE_OVERRIDE_KEY, trimmed.replace(/\/$/, ""));
  } else {
    localStorage.removeItem(API_BASE_OVERRIDE_KEY);
  }
}

export function defaultApiBaseHint(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv === undefined || fromEnv === "") {
    return "/api (proxy → Django :8000)";
  }
  return String(fromEnv);
}
