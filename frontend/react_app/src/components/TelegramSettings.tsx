import { useCallback, useEffect, useState, type FormEvent } from "react";

import { PropertyField } from "@/components/FormFields";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  inputClass,
  selectClassFull,
} from "@/lib/uiClasses";

interface TelegramStatus {
  configured: boolean;
  connected: boolean;
  bot_username: string;
  token_hint: string;
  chat_username: string | null;
  timezone: string;
  digest_hour: number;
  remind_minutes: number;
  deep_link: string;
  timezones: string[];
}

const TZ_LABELS: Record<string, string> = {
  "Europe/Kaliningrad": "Калининград (UTC+2)",
  "Europe/Moscow": "Москва (UTC+3)",
  "Europe/Samara": "Самара (UTC+4)",
  "Europe/Astrakhan": "Астрахань (UTC+4)",
  "Asia/Yekaterinburg": "Екатеринбург (UTC+5)",
  "Asia/Omsk": "Омск (UTC+6)",
  "Asia/Novosibirsk": "Новосибирск (UTC+7)",
  "Asia/Krasnoyarsk": "Красноярск (UTC+7)",
  "Asia/Irkutsk": "Иркутск (UTC+8)",
  "Asia/Yakutsk": "Якутск (UTC+9)",
  "Asia/Vladivostok": "Владивосток (UTC+10)",
  "Asia/Magadan": "Магадан (UTC+11)",
  "Asia/Kamchatka": "Камчатка (UTC+12)",
  UTC: "UTC",
};

const emptyStatus: TelegramStatus = {
  configured: false,
  connected: false,
  bot_username: "",
  token_hint: "",
  chat_username: null,
  timezone: "Europe/Moscow",
  digest_hour: 8,
  remind_minutes: 30,
  deep_link: "",
  timezones: ["Europe/Moscow"],
};

function fieldError(data: unknown, field: string): string {
  if (!data || typeof data !== "object") return "";
  const value = (data as Record<string, unknown>)[field];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (typeof value === "string") return value;
  return "";
}

export function TelegramSettings() {
  const { pushToast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [token, setToken] = useState("");
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [digestHour, setDigestHour] = useState(8);
  const [remindMinutes, setRemindMinutes] = useState(30);
  const [busy, setBusy] = useState(false);

  const applyStatus = useCallback((data: TelegramStatus) => {
    setStatus(data);
    setTimezone(data.timezone);
    setDigestHour(data.digest_hour);
    setRemindMinutes(data.remind_minutes);
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await apiFetch("/telegram/");
    if (!res.ok) return;
    applyStatus((await res.json()) as TelegramStatus);
  }, [applyStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.configured || status.connected) return;
    const id = window.setInterval(() => {
      void loadStatus();
    }, 2500);
    return () => window.clearInterval(id);
  }, [status?.configured, status?.connected, loadStatus]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body: Record<string, string | number> = {
        timezone,
        digest_hour: digestHour,
        remind_minutes: remindMinutes,
      };
      if (token.trim()) body.token = token.trim();
      const res = await apiFetch("/telegram/", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          fieldError(data, "token") ||
            fieldError(data, "timezone") ||
            fieldError(data, "detail") ||
            "Не удалось сохранить бота",
        );
      }
      setToken("");
      applyStatus(data as TelegramStatus);
      pushToast("Бот сохранён", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Ошибка сохранения", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    setBusy(true);
    try {
      const res = await apiFetch("/telegram/unlink/", { method: "POST" });
      if (!res.ok) throw new Error("unlink failed");
      applyStatus((await res.json()) as TelegramStatus);
      pushToast("Чат отвязан", "info");
    } catch {
      pushToast("Не удалось отвязать чат", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await apiFetch("/telegram/", { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("delete failed");
      setToken("");
      applyStatus({ ...emptyStatus, timezones: status?.timezones ?? emptyStatus.timezones });
      await loadStatus();
      pushToast("Бот удалён", "info");
    } catch {
      pushToast("Не удалось удалить бота", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <p className="text-sm text-app-muted" aria-hidden>
        Загрузка…
      </p>
    );
  }

  const zones = status.timezones.length ? status.timezones : emptyStatus.timezones;

  return (
    <div className="space-y-5">
      <p className="text-sm text-app-muted">
        Создайте бота в{" "}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noreferrer"
          className="text-app-accent hover:underline"
        >
          @BotFather
        </a>
        , вставьте токен сюда и напишите ему /start. В чат попадут только ваши
        задачи.
      </p>

      {status.configured ? (
        <div className="flex items-center justify-between gap-3 rounded-md bg-app-surface-muted px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm text-app">@{status.bot_username}</p>
            <p className="text-xs text-app-subtle">
              Токен {status.token_hint}
              {status.connected
                ? status.chat_username
                  ? ` · чат @${status.chat_username}`
                  : " · чат подключён"
                : " · напишите боту /start"}
            </p>
          </div>
          {status.connected ? (
            <span className="shrink-0 rounded-full bg-[var(--app-accent-soft)] px-2 py-0.5 text-xs font-medium text-app-accent">
              Вкл
            </span>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-4">
        <PropertyField label="Токен бота" htmlFor="tg-token">
          <input
            id="tg-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={
              status.configured
                ? `Оставьте пустым, чтобы не менять (${status.token_hint})`
                : "123456:AAH…"
            }
            className={inputClass}
          />
        </PropertyField>
        <PropertyField label="Часовой пояс" htmlFor="tg-tz">
          <select
            id="tg-tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={selectClassFull}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {TZ_LABELS[zone] ?? zone}
              </option>
            ))}
          </select>
        </PropertyField>
        <div className="grid grid-cols-2 gap-3">
          <PropertyField label="Сводка, час" htmlFor="tg-hour">
            <input
              id="tg-hour"
              type="number"
              min={0}
              max={23}
              value={digestHour}
              onChange={(e) => setDigestHour(Number(e.target.value))}
              className={inputClass}
            />
          </PropertyField>
          <PropertyField label="Напоминание, мин" htmlFor="tg-remind">
            <input
              id="tg-remind"
              type="number"
              min={5}
              max={1440}
              value={remindMinutes}
              onChange={(e) => setRemindMinutes(Number(e.target.value))}
              className={inputClass}
            />
          </PropertyField>
        </div>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Сохранение…" : "Сохранить бота"}
        </button>
      </form>

      {status.configured && !status.connected && status.deep_link ? (
        <a
          href={status.deep_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm text-app-accent hover:underline"
        >
          Открыть @{status.bot_username} и нажать Start
        </a>
      ) : null}

      {status.configured ? (
        <div className="flex flex-wrap gap-2">
          {status.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleUnlink()}
              className={btnSecondary}
            >
              Отвязать чат
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className={btnDanger}
          >
            Удалить бота
          </button>
        </div>
      ) : null}
    </div>
  );
}
