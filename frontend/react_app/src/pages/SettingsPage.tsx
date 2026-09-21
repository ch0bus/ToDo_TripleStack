import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PropertyField } from "@/components/FormFields";
import { QuickUnlockSettings } from "@/components/QuickUnlockSettings";
import { SettingsSection } from "@/components/SettingsSection";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { TagsSettingsSection } from "@/components/TagsSettingsSection";
import { TelegramSettings } from "@/components/TelegramSettings";
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
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
} from "@/lib/uiClasses";

interface Profile {
  id: number;
  username: string;
  email: string;
  phone_number: string | null;
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Как в системе" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

function Chevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-app-subtle"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => getApiBaseOverride());
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingApi, setSavingApi] = useState(false);
  const [error, setError] = useState("");

  const showDeveloper =
    import.meta.env.DEV || Boolean(getApiBaseOverride()) || Boolean(apiUrl);

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
    void load();
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
      setShowPassword(false);
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
    pushToast("Адрес API сохранён. Обновите страницу, если запросы идут не туда.", "success");
    setSavingApi(false);
  }

  function handleApiReset() {
    setApiUrl("");
    setApiBaseOverride("");
    pushToast("Сброшено на значение по умолчанию", "info");
  }

  function handleLogout() {
    logoutKeepLock();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
        <SettingsSkeleton />
      </div>
    );
  }

  const initial = (profile?.username ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
      <header className="mb-8 flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-lg font-semibold text-app-accent"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-app">Настройки</h1>
          {profile ? (
            <p className="truncate text-sm text-app-muted">{profile.username}</p>
          ) : null}
        </div>
      </header>

      {error && (
        <div className="chip-danger mb-6 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        <SettingsSection title="Аккаунт">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <PropertyField label="Почта" htmlFor="settings-email">
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
            </PropertyField>
            <PropertyField label="Телефон" htmlFor="settings-phone">
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7…"
                autoComplete="tel"
                className={inputClass}
              />
            </PropertyField>
            {showPassword ? (
              <PropertyField label="Новый пароль" htmlFor="settings-password">
                <input
                  id="settings-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </PropertyField>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={savingProfile} className={btnPrimary}>
                {savingProfile ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                className="text-sm text-app-muted hover:text-app"
                onClick={() => {
                  setShowPassword((open) => !open);
                  if (showPassword) setPassword("");
                }}
              >
                {showPassword ? "Не менять пароль" : "Сменить пароль"}
              </button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Оформление">
          <div
            role="radiogroup"
            aria-label="Тема"
            className="flex rounded-lg bg-app-surface-muted p-1"
          >
            {THEME_OPTIONS.map((opt) => {
              const selected = themeMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setThemeMode(opt.value)}
                  className={
                    "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] " +
                    (selected
                      ? "bg-app-surface font-medium text-app shadow-sm"
                      : "text-app-muted hover:text-app")
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {profile ? (
          <SettingsSection
            title="Быстрый вход"
            description="PIN и биометрия только на этом устройстве. На новом телефоне их нужно включить снова."
          >
            <QuickUnlockSettings username={profile.username} />
          </SettingsSection>
        ) : null}

        <SettingsSection
          title="Telegram"
          description="Свой бот из BotFather: токен, пояс и напоминания."
        >
          <TelegramSettings />
        </SettingsSection>

        <SettingsSection
          title="Теги"
          description="Системные теги можно скрыть из меню и форм — на задачах они останутся."
        >
          <TagsSettingsSection />
        </SettingsSection>

        <section className="space-y-3">
          <h2 className="px-0.5 text-sm font-semibold text-app">Планер</h2>
          <Link
            to="/settings/shifts"
            state={{ from: "/settings" }}
            className={
              "flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] " +
              cardClass
            }
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-app">Смены</p>
              <p className="text-sm text-app-muted">
                Типы, слои и шаблон цикла
              </p>
            </div>
            <Chevron />
          </Link>
        </section>

        {showDeveloper ? (
          <details className={"group " + cardClass}>
            <summary className="cursor-pointer list-none px-5 py-4 text-sm text-app-muted marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                Для разработчиков
                <span className="text-app-subtle transition-transform group-open:rotate-90">
                  <Chevron />
                </span>
              </span>
            </summary>
            <form
              onSubmit={handleApiSave}
              className="space-y-3 border-t border-app px-5 py-4"
            >
              <PropertyField label="Адрес API" htmlFor="settings-api-url">
                <p className="mb-2 text-xs text-app-subtle">
                  Сейчас: {defaultApiBaseHint()}
                </p>
                <input
                  id="settings-api-url"
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8000/api"
                  className={inputClass}
                />
              </PropertyField>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={savingApi} className={btnSecondary}>
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={handleApiReset}
                  className={btnSecondary}
                >
                  Сбросить
                </button>
              </div>
            </form>
          </details>
        ) : null}

        <section className={"p-5 " + cardClass}>
          <h2 className="mb-1 text-sm font-semibold text-app">Выход</h2>
          <p className="mb-4 text-sm text-app-muted">
            Сессия на этом устройстве закроется. Быстрый вход сохранится.
          </p>
          <button type="button" onClick={handleLogout} className={btnDanger}>
            Выйти из аккаунта
          </button>
        </section>
      </div>
    </div>
  );
}
