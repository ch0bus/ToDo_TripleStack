import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { apiBaseUrl, setTokens } from "@/lib/auth";
import { btnPrimary, inputClass } from "@/lib/uiClasses";

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
    <AuthLayout
      title="Вход"
      subtitle="Войдите, чтобы открыть день: входящие, календарь и смены."
      footer={
        <>
          Нет аккаунта?{" "}
          <Link to="/register" className="text-app-accent hover:underline">
            Регистрация
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-app-muted" htmlFor="username">
            Логин
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-app-muted" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--app-danger)]" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={btnPrimary + " w-full"}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </AuthLayout>
  );
}
