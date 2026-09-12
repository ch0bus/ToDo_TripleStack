import {
  apiBaseUrl,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth";

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(`${apiBaseUrl()}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as { access: string; refresh?: string };
  setTokens(data.access, data.refresh ?? refresh);
  return true;
}

async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let res = await fetchWithAuth(path, init);

  if (res.status !== 401 || typeof window === "undefined") {
    return res;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshed = await refreshInFlight;
  if (refreshed) {
    res = await fetchWithAuth(path, init);
    if (res.status !== 401) return res;
  }

  clearTokens();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
  return res;
}
