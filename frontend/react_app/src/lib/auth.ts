import { getApiBaseOverride } from "@/lib/settings";

const ACCESS_KEY = "todo_access_token";
const REFRESH_KEY = "todo_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function apiBaseUrl(): string {
  const override = getApiBaseOverride();
  if (override !== "") {
    return override.replace(/\/$/, "");
  }
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv === undefined || fromEnv === "") {
    return "/api";
  }
  return fromEnv.replace(/\/$/, "");
}
