"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !email || !password) {
      setError("Заполните все поля");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.detail || data?.message || "Ошибка регистрации");
      } else {
        setSuccess("Аккаунт успешно создан. Проверьте почту (если требуется).");
        form.reset();
      }
    } catch (err) {
      setError("Сетевая ошибка. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-semibold mb-2">Создать аккаунт</h1>
          <p className="text-sm text-slate-400 mb-6">Быстро зарегистрируйтесь и начните вести список задач.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm mb-1">Логин</label>
              <input
                id="username"
                name="username"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="например, ivan123"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-1">Пароль</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 pr-12 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Минимум 6 символов"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-300 hover:text-slate-100"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}
            {success && <div className="text-sm text-green-400">{success}</div>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? "Создание..." : "Зарегистрироваться"}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400">
            Уже есть аккаунт? <a href="/login" className="text-blue-400 hover:underline">Войти</a>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} ToDoApp</div>
      </div>
    </main>
  );
}
