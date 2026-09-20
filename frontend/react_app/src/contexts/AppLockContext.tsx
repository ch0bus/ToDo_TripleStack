import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  LOCK_AWAY_MS,
  PIN_ATTEMPTS_MAX,
  changeLockPin,
  clearLockConfig,
  disableWebAuthn,
  enableLock,
  enrollWebAuthn,
  getLockConfig,
  hasWebAuthn,
  isLockEnabled,
  isSessionUnlocked,
  isValidPin,
  logoutAndClearLock,
  markSessionLocked,
  markSessionUnlocked,
  platformAuthAvailable,
  recordPinFailure,
  resetPinFailures,
  verifyPin,
  verifyWebAuthn,
  webAuthnSupported,
} from "@/lib/appLock";
import { getAccessToken } from "@/lib/auth";

interface AppLockContextValue {
  enabled: boolean;
  unlocked: boolean;
  hasBiometric: boolean;
  biometricAvailable: boolean;
  pinLength: number;
  lock: () => void;
  unlockWithPin: (pin: string) => Promise<"ok" | "bad" | "locked-out">;
  unlockWithBiometric: () => Promise<boolean>;
  enableWithPin: (username: string, pin: string) => Promise<void>;
  updatePin: (username: string, pin: string) => Promise<void>;
  disable: () => void;
  enrollBiometric: (username: string) => Promise<void>;
  removeBiometric: () => void;
  signInWithPassword: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

function shouldGate(): boolean {
  return Boolean(getAccessToken()) && isLockEnabled();
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => isLockEnabled());
  const [unlocked, setUnlocked] = useState(() => {
    if (!shouldGate()) return true;
    return isSessionUnlocked();
  });
  const [hasBiometric, setHasBiometric] = useState(() => hasWebAuthn());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinLength, setPinLength] = useState(() => getLockConfig()?.pinLength ?? 4);

  const refresh = useCallback(() => {
    const on = isLockEnabled();
    setEnabled(on);
    setHasBiometric(hasWebAuthn());
    setPinLength(getLockConfig()?.pinLength ?? 4);
    if (!getAccessToken() || !on) {
      setUnlocked(true);
      return;
    }
    setUnlocked(isSessionUnlocked());
  }, []);

  useEffect(() => {
    void platformAuthAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    function onStorage() {
      refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  useEffect(() => {
    if (!shouldGate()) return;
    let hiddenAt = 0;
    function onVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt >= LOCK_AWAY_MS) {
        markSessionLocked();
        setUnlocked(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);

  const lock = useCallback(() => {
    if (!isLockEnabled()) return;
    markSessionLocked();
    setUnlocked(false);
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    if (!isValidPin(pin)) return "bad" as const;
    const ok = await verifyPin(pin);
    if (ok) {
      resetPinFailures();
      markSessionUnlocked();
      setUnlocked(true);
      return "ok" as const;
    }
    const failed = recordPinFailure();
    if (failed >= PIN_ATTEMPTS_MAX) {
      logoutAndClearLock();
      refresh();
      return "locked-out" as const;
    }
    return "bad" as const;
  }, [refresh]);

  const unlockWithBiometric = useCallback(async () => {
    try {
      const ok = await verifyWebAuthn();
      if (!ok) return false;
      resetPinFailures();
      markSessionUnlocked();
      setUnlocked(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const enableWithPin = useCallback(async (username: string, pin: string) => {
    await enableLock(username, pin);
    refresh();
    setUnlocked(true);
  }, [refresh]);

  const updatePin = useCallback(async (username: string, pin: string) => {
    await changeLockPin(username, pin);
    refresh();
  }, [refresh]);

  const disable = useCallback(() => {
    clearLockConfig();
    refresh();
    setUnlocked(true);
  }, [refresh]);

  const enrollBiometric = useCallback(async (username: string) => {
    await enrollWebAuthn(username);
    refresh();
  }, [refresh]);

  const removeBiometric = useCallback(() => {
    disableWebAuthn();
    refresh();
  }, [refresh]);

  const signInWithPassword = useCallback(() => {
    logoutAndClearLock();
    refresh();
    setUnlocked(true);
  }, [refresh]);

  const value = useMemo(
    () => ({
      enabled,
      unlocked: !shouldGate() || unlocked,
      hasBiometric,
      biometricAvailable: biometricAvailable && webAuthnSupported(),
      pinLength,
      lock,
      unlockWithPin,
      unlockWithBiometric,
      enableWithPin,
      updatePin,
      disable,
      enrollBiometric,
      removeBiometric,
      signInWithPassword,
    }),
    [
      enabled,
      unlocked,
      hasBiometric,
      biometricAvailable,
      pinLength,
      lock,
      unlockWithPin,
      unlockWithBiometric,
      enableWithPin,
      updatePin,
      disable,
      enrollBiometric,
      removeBiometric,
      signInWithPassword,
    ],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const value = useContext(AppLockContext);
  if (!value) throw new Error("useAppLock outside provider");
  return value;
}
