import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { apiBaseUrl } from "@/lib/auth";
import { btnPrimary, inputClass } from "@/lib/uiClasses";

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
    <AuthLayout
      title="Создать аккаунт"
      subtitle="Зарегистрируйтесь и начните вести список задач."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-app-accent hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm text-app-muted">
            Логин
          </label>
          <input
            id="username"
            name="username"
            className={inputClass}
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-app-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={inputClass}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-app-muted">
            Пароль
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className={inputClass + " pr-20"}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-app-muted hover:text-app"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[var(--app-danger)]" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={btnPrimary + " w-full"}
        >
          {loading ? "Создание..." : "Зарегистрироваться"}
        </button>
      </form>
    </AuthLayout>
  );
}
