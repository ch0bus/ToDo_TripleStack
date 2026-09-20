import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { TagsSettingsSection } from "@/components/TagsSettingsSection";
import { QuickUnlockSettings } from "@/components/QuickUnlockSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import { logoutKeepLock } from "@/lib/appLock";
import {
  defaultApiBaseHint,
  getApiBaseOverride,
  setApiBaseOverride,
} from "@/lib/settings";
import type { ThemeMode } from "@/lib/theme";
import { btnPrimary, btnSecondary, cardClass, inputClass } from "@/lib/uiClasses";

interface Profile {
  id: number;
  username: string;
  email: string;
  phone_number: string | null;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState(() => getApiBaseOverride());
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingApi, setSavingApi] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch("/auth/me/");
        if (!res.ok) throw new Error("profile");
        const data = (await res.json()) as Profile;
        setProfile(data);
        setEmail(data.email);
        setPhone(data.phone_number ?? "");
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setSavingProfile(true);
      const body: Record<string, string> = {
        email: email.trim(),
        phone_number: phone.trim(),
      };
      if (password.trim()) {
        body.password = password.trim();
      }
      const res = await apiFetch("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data.email?.[0] as string) ||
            (data.detail as string) ||
            "Ошибка сохранения",
        );
      }
      const updated = (await res.json()) as Profile;
      setProfile(updated);
      setPassword("");
      pushToast("Профиль сохранён", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка сохранения";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleApiSave(e: FormEvent) {
    e.preventDefault();
    setSavingApi(true);
    setApiBaseOverride(apiUrl);
    pushToast(
      "URL API сохранён. Обновите страницу, если запросы ведут себя странно.",
      "success",
    );
    setSavingApi(false);
  }

  function handleApiReset() {
    setApiUrl("");
    setApiBaseOverride("");
    pushToast("Сброшено на значение по умолчанию.", "info");
  }

  function handleLogout() {
    logoutKeepLock();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-app">Настройки</h1>
        <SettingsSkeleton />
      </div>
    );
  }

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: "Как в системе" },
    { value: "light", label: "Светлая" },
    { value: "dark", label: "Тёмная" },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-app">Настройки</h1>
        <Link to="/" className="text-sm text-app-accent hover:underline">
          ← Входящие
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className={"mb-8 p-5 " + cardClass}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-app-muted">
          Оформление
        </h2>
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setThemeMode(opt.value);
                pushToast(`Тема: ${opt.label.toLowerCase()}`, "info");
              }}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (themeMode === opt.value
                  ? "border-[var(--app-accent)] bg-[var(--app-accent)]/15 text-app-accent"
                  : "border-app text-app-muted hover:text-app")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className={"mb-8 p-5 " + cardClass}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-app-muted">
          Профиль
        </h2>
        {profile && (
          <p className="mb-4 text-sm text-app-muted">
            Логин:{" "}
            <span className="font-medium text-app">{profile.username}</span>
          </p>
        )}
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-app-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-app-muted">Телефон</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-app-muted">
              Новый пароль (необязательно)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={savingProfile} className={btnPrimary}>
            {savingProfile ? "Сохранение..." : "Сохранить профиль"}
          </button>
        </form>
      </section>

      <TagsSettingsSection />

      {profile ? <QuickUnlockSettings username={profile.username} /> : null}

      <section className={"mb-8 p-5 " + cardClass}>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-app-muted">
          Смены
        </h2>
        <p className="mb-3 text-sm text-app-muted">
          Типы смен, слои и шаблон цикла.
        </p>
        <Link
          to="/settings/shifts"
          state={{ from: "/settings" }}
          className="text-sm text-app-accent hover:underline"
        >
          Настройки смен
        </Link>
      </section>

      <section className={"mb-8 p-5 " + cardClass}>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-app-muted">
          Подключение к API
        </h2>
        <p className="mb-4 text-xs text-app-subtle">
          По умолчанию: {defaultApiBaseHint()}. Укажите свой URL для FastAPI/Flask
          или прямого доступа к Django.
        </p>
        <form onSubmit={handleApiSave} className="space-y-3">
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://127.0.0.1:8000/api"
            className={inputClass}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={savingApi} className={btnSecondary}>
              Сохранить URL
            </button>
            <button type="button" onClick={handleApiReset} className={btnSecondary}>
              Сбросить
            </button>
          </div>
        </form>
      </section>

      <section className={"p-5 " + cardClass}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-app-muted">
          Сессия
        </h2>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
        >
          Выйти из аккаунта
        </button>
      </section>
    </div>
  );
}
