import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { apiBaseUrl } from "@/lib/auth";

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !email || !password) {
      setError("Заполните все поля");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (data?.detail as string) ||
            (data?.message as string) ||
            "Ошибка регистрации",
        );
      } else {
        setSuccess("Аккаунт создан. Теперь можно войти.");
        form.reset();
      }
    } catch {
      setError("Сетевая ошибка. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-slate-50">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-8 shadow-lg backdrop-blur-md">
          <h1 className="mb-2 text-2xl font-semibold">Создать аккаунт</h1>
          <p className="mb-6 text-sm text-slate-400">
            Зарегистрируйтесь и начните вести список задач.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm">
                Логин
              </label>
              <input
                id="username"
                name="username"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-slate-300 hover:text-slate-100"
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}
            {success && <div className="text-sm text-green-400">{success}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Создание..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
