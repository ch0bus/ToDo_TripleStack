import { useState } from "react";

import { PropertyField } from "@/components/FormFields";
import { useAppLock } from "@/contexts/AppLockContext";
import { useToast } from "@/contexts/ToastContext";
import { PIN_MAX, PIN_MIN, isValidPin } from "@/lib/appLock";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/uiClasses";

export function QuickUnlockSettings({ username }: { username: string }) {
  const {
    enabled,
    hasBiometric,
    biometricAvailable,
    enableWithPin,
    updatePin,
    disable,
    enrollBiometric,
    removeBiometric,
  } = useAppLock();
  const { pushToast } = useToast();
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"idle" | "create" | "change">(
    enabled ? "idle" : "create",
  );

  async function savePin(kind: "create" | "change") {
    if (pin !== pinAgain) {
      pushToast("PIN не совпадает", "error");
      return;
    }
    if (!isValidPin(pin)) {
      pushToast(`PIN — ${PIN_MIN}–${PIN_MAX} цифр`, "error");
      return;
    }
    setBusy(true);
    try {
      if (kind === "create") await enableWithPin(username, pin);
      else await updatePin(username, pin);
      setPin("");
      setPinAgain("");
      setMode("idle");
      pushToast(kind === "create" ? "Быстрый вход включён" : "PIN обновлён", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Не удалось сохранить PIN", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleBiometric() {
    setBusy(true);
    try {
      await enrollBiometric(username);
      pushToast("Лицо или отпечаток включены", "success");
    } catch (e) {
      const message =
        e instanceof Error && e.name === "NotAllowedError"
          ? "Отменено"
          : "Этот браузер или сайт не поддерживает вход устройства";
      pushToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (enabled && mode === "idle") {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-app">PIN</p>
              <p className="text-xs text-app-subtle">Включён на этом устройстве</p>
            </div>
            <span className="rounded-full bg-[var(--app-accent-soft)] px-2 py-0.5 text-xs font-medium text-app-accent">
              Вкл
            </span>
          </div>
          {biometricAvailable ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-app">Лицо или отпечаток</p>
                <p className="text-xs text-app-subtle">
                  {hasBiometric ? "Можно входить без PIN" : "Не настроено"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (hasBiometric) {
                    removeBiometric();
                    pushToast("Вход устройства выключен", "info");
                  } else {
                    void handleBiometric();
                  }
                }}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-app-muted hover:bg-app-surface-muted hover:text-app disabled:opacity-50"
              >
                {hasBiometric ? "Выключить" : "Включить"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-app-subtle">
              Этот браузер не умеет вход по лицу или отпечатку — остаётся PIN.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              setPin("");
              setPinAgain("");
              setMode("change");
            }}
          >
            Сменить PIN
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              disable();
              setMode("create");
              pushToast("Быстрый вход выключен", "info");
            }}
          >
            Выключить
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void savePin(mode === "change" ? "change" : "create");
      }}
    >
      <PropertyField
        label={mode === "change" ? "Новый PIN" : "PIN"}
        htmlFor="settings-pin"
      >
        <input
          id="settings-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          maxLength={PIN_MAX}
          placeholder={`${PIN_MIN}–${PIN_MAX} цифр`}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX))}
          className={inputClass}
        />
      </PropertyField>
      <PropertyField label="Ещё раз" htmlFor="settings-pin-again">
        <input
          id="settings-pin-again"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pinAgain}
          maxLength={PIN_MAX}
          onChange={(e) =>
            setPinAgain(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX))
          }
          className={inputClass}
        />
      </PropertyField>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {mode === "change" ? "Сохранить PIN" : "Включить"}
        </button>
        {enabled ? (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setMode("idle")}
          >
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  );
}
