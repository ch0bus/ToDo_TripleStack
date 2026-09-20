import { getApiBaseOverride } from "@/lib/settings";

const ACCESS_KEY = "todo_access_token";
const REFRESH_KEY = "todo_refresh_token";
const USERNAME_KEY = "todo_auth_username";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string, username?: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  if (username) {
    localStorage.setItem(USERNAME_KEY, username);
  }
}

export function setAuthUsername(username: string): void {
  localStorage.setItem(USERNAME_KEY, username);
}

export function getAuthUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USERNAME_KEY);
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
