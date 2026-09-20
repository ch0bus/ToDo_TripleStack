import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/BrandMark";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { useAppLock } from "@/contexts/AppLockContext";
import { remainingPinAttempts } from "@/lib/appLock";
import { getAccessToken } from "@/lib/auth";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function LockScreen() {
  const navigate = useNavigate();
  const {
    pinLength,
    hasBiometric,
    unlockWithPin,
    unlockWithBiometric,
    signInWithPassword,
  } = useAppLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasBiometric) return;
    let cancelled = false;
    void unlockWithBiometric().then((ok) => {
      if (cancelled || ok) return;
    });
    return () => {
      cancelled = true;
    };
  }, [hasBiometric, unlockWithBiometric]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setPin((value) => value.slice(0, -1));
        return;
      }
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        pushDigit(e.key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function submit(nextPin: string) {
    if (busy || nextPin.length !== pinLength) return;
    setBusy(true);
    setError("");
    const result = await unlockWithPin(nextPin);
    setBusy(false);
    if (result === "ok") return;
    setPin("");
    if (result === "locked-out") {
      navigate("/login", { replace: true });
      return;
    }
    const left = remainingPinAttempts();
    setError(
      left
        ? `Неверный PIN. Осталось попыток: ${left}`
        : "Неверный PIN",
    );
  }

  function pushDigit(digit: string) {
    if (busy) return;
    setError("");
    const next = (pin + digit).slice(0, pinLength);
    setPin(next);
    if (next.length === pinLength) void submit(next);
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-app text-app">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex justify-center">
          <BrandMark size="lg" />
        </div>
        <h1 className="text-center text-xl font-semibold text-app">Быстрый вход</h1>
        <p className="mt-2 text-center text-sm text-app-muted">
          Введите PIN этого устройства
        </p>

        <div className="mt-6 flex justify-center gap-2" aria-hidden>
          {Array.from({ length: pinLength }).map((_, i) => (
            <span
              key={i}
              className={
                "h-3 w-3 rounded-full border border-app " +
                (i < pin.length ? "bg-app-accent" : "bg-transparent")
              }
            />
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-center text-sm text-[var(--app-danger)]">{error}</p>
        ) : (
          <p className="mt-4 h-5" />
        )}

        {hasBiometric ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void unlockWithBiometric()}
            className="mt-2 text-sm text-app-accent hover:underline"
          >
            Открыть по лицу или отпечатку
          </button>
        ) : null}

        <div className="mx-auto mt-6 grid w-56 grid-cols-3 gap-2">
          {KEYS.map((key) => {
            if (!key) return <span key="pad" />;
            if (key === "del") {
              return (
                <button
                  key="del"
                  type="button"
                  disabled={busy}
                  aria-label="Удалить"
                  onClick={() => setPin((value) => value.slice(0, -1))}
                  className="h-14 rounded-full text-sm text-app-muted hover:bg-app-surface-muted"
                >
                  ←
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => pushDigit(key)}
                className="h-14 rounded-full text-xl font-medium text-app hover:bg-app-surface-muted"
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="mt-8 text-center text-sm text-app-muted hover:text-app-accent"
          onClick={() => {
            signInWithPassword();
            navigate("/login", { replace: true });
          }}
        >
          Войти с логином и паролем
        </button>
      </div>
    </main>
  );
}

export function AppLockGate({ children }: { children: ReactNode }) {
  const { enabled, unlocked } = useAppLock();
  if (getAccessToken() && enabled && !unlocked) {
    return <LockScreen />;
  }
  return <>{children}</>;
}
