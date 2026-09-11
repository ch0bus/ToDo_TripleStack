import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiBaseUrl, setTokens } from "@/lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl()}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail =
          (data.detail as string | undefined) ??
          "Не удалось войти. Проверь логин и пароль.";
        throw new Error(detail);
      }

      const data = (await res.json()) as { access: string; refresh: string };
      setTokens(data.access, data.refresh);
      navigate("/");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-50">
      <div className="w-full max-w-sm px-4 py-8">
        <h1 className="mb-6 text-center text-2xl font-bold">Вход</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm" htmlFor="username">
              Логин
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-blue-400 hover:underline">
            Регистрация
          </Link>
        </p>
      </div>
    </main>
  );
}
