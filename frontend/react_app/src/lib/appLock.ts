import { clearTokens, getAuthUsername, setAuthUsername } from "@/lib/auth";

const CONFIG_KEY = "todo_app_lock";
const UNLOCKED_KEY = "todo_app_unlocked";
export const LOCK_AWAY_MS = 30_000;
export const PIN_MIN = 4;
export const PIN_MAX = 6;
export const PIN_ATTEMPTS_MAX = 5;

export interface AppLockConfig {
  username: string;
  pinSalt: string;
  pinHash: string;
  pinLength: number;
  failedAttempts: number;
  webauthnCredentialId?: string;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function b64ToBytes(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  return bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(value: string): Uint8Array {
  const pad = (4 - (value.length % 4)) % 4;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return b64ToBytes(padded);
}

function bufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN && pin.length <= PIN_MAX;
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: bufferSource(salt),
      iterations: 100_000,
    },
    key,
    256,
  );
  return bytesToB64(new Uint8Array(bits));
}

export function getLockConfig(): AppLockConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppLockConfig;
    if (!parsed.pinHash || !parsed.pinSalt || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLockConfig(config: AppLockConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isLockEnabled(): boolean {
  const config = getLockConfig();
  if (!config) return false;
  const username = getAuthUsername();
  if (!username) return true;
  return config.username === username;
}

export function clearLockConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCKED_KEY) === "1";
}

export function markSessionUnlocked(): void {
  sessionStorage.setItem(UNLOCKED_KEY, "1");
}

export function markSessionLocked(): void {
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export function bindLockToLogin(username: string): void {
  const config = getLockConfig();
  if (config && config.username !== username) {
    clearLockConfig();
  }
}

export async function enableLock(username: string, pin: string): Promise<void> {
  if (!isValidPin(pin)) {
    throw new Error(`PIN — ${PIN_MIN}–${PIN_MAX} цифр`);
  }
  const salt = randomBytes(16);
  const pinHash = await hashPin(pin, salt);
  saveLockConfig({
    username,
    pinSalt: bytesToB64(salt),
    pinHash,
    pinLength: pin.length,
    failedAttempts: 0,
  });
  setAuthUsername(username);
  markSessionUnlocked();
}

export async function changeLockPin(username: string, pin: string): Promise<void> {
  const current = getLockConfig();
  await enableLock(username, pin);
  if (current?.webauthnCredentialId) {
    const next = getLockConfig();
    if (next) {
      saveLockConfig({
        ...next,
        webauthnCredentialId: current.webauthnCredentialId,
      });
    }
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = getLockConfig();
  if (!config) return false;
  const hash = await hashPin(pin, b64ToBytes(config.pinSalt));
  return hash === config.pinHash;
}

export function recordPinFailure(): number {
  const config = getLockConfig();
  if (!config) return PIN_ATTEMPTS_MAX;
  const failedAttempts = (config.failedAttempts || 0) + 1;
  saveLockConfig({ ...config, failedAttempts });
  return failedAttempts;
}

export function resetPinFailures(): void {
  const config = getLockConfig();
  if (!config || !config.failedAttempts) return;
  saveLockConfig({ ...config, failedAttempts: 0 });
}

export function remainingPinAttempts(): number {
  const config = getLockConfig();
  if (!config) return PIN_ATTEMPTS_MAX;
  return Math.max(0, PIN_ATTEMPTS_MAX - (config.failedAttempts || 0));
}

export function webAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
}

export async function platformAuthAvailable(): Promise<boolean> {
  if (!webAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
      return true;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasWebAuthn(): boolean {
  return Boolean(getLockConfig()?.webauthnCredentialId);
}

export async function enrollWebAuthn(username: string): Promise<void> {
  const config = getLockConfig();
  if (!config) throw new Error("Сначала включите PIN");
  const userId = randomBytes(16);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: bufferSource(randomBytes(32)),
      rp: { name: "Haloday", id: window.location.hostname },
      user: {
        id: bufferSource(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 60_000,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Не удалось сохранить вход устройства");
  saveLockConfig({
    ...config,
    username,
    webauthnCredentialId: bytesToB64url(new Uint8Array(credential.rawId)),
  });
}

export async function verifyWebAuthn(): Promise<boolean> {
  const config = getLockConfig();
  if (!config?.webauthnCredentialId) return false;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: bufferSource(randomBytes(32)),
      timeout: 60_000,
      userVerification: "required",
      allowCredentials: [
        {
          type: "public-key",
          id: bufferSource(b64urlToBytes(config.webauthnCredentialId)),
        },
      ],
    },
  });
  return Boolean(assertion);
}

export function disableWebAuthn(): void {
  const config = getLockConfig();
  if (!config) return;
  saveLockConfig({
    username: config.username,
    pinSalt: config.pinSalt,
    pinHash: config.pinHash,
    pinLength: config.pinLength,
    failedAttempts: config.failedAttempts,
  });
}

export function logoutAndClearLock(): void {
  clearLockConfig();
  clearTokens();
}

export function logoutKeepLock(): void {
  markSessionLocked();
  clearTokens();
}
