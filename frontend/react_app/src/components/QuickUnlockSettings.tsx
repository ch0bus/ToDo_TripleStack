import { useState } from "react";

import { useAppLock } from "@/contexts/AppLockContext";
import { useToast } from "@/contexts/ToastContext";
import { PIN_MAX, PIN_MIN, isValidPin } from "@/lib/appLock";
import { btnPrimary, btnSecondary, cardClass, inputClass } from "@/lib/uiClasses";

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

  return (
    <section className={"mb-8 p-5 " + cardClass}>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-app-muted">
        Быстрый вход
      </h2>
      <p className="mb-4 text-sm text-app-muted">
        PIN только на этом устройстве. На новом телефоне его нужно включить снова.
        После пароля можно открывать приложение PIN-ом или лицом / отпечатком.
      </p>

      {enabled && mode === "idle" ? (
        <div className="space-y-3">
          <p className="text-sm text-app">PIN включён.</p>
          {biometricAvailable ? (
            hasBiometric ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  removeBiometric();
                  pushToast("Вход устройства выключен", "info");
                }}
                className={btnSecondary}
              >
                Выключить лицо / отпечаток
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleBiometric()}
                className={btnSecondary}
              >
                Включить лицо / отпечаток
              </button>
            )
          ) : (
            <p className="text-xs text-app-subtle">
              Этот браузер не умеет вход по лицу или отпечатку. Можно пользоваться PIN.
            </p>
          )}
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
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void savePin(mode === "change" ? "change" : "create");
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-app-muted">
              {mode === "change" ? "Новый PIN" : "PIN"} ({PIN_MIN}–{PIN_MAX} цифр)
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              maxLength={PIN_MAX}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-app-muted">Ещё раз</label>
            <input
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
          </div>
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
      )}
    </section>
  );
}
