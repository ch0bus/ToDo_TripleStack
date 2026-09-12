import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  durationMs: number;
}

interface PushToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextValue {
  pushToast: (message: string, options?: PushToastOptions | ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

function normalizeOptions(
  options?: PushToastOptions | ToastVariant,
): PushToastOptions {
  if (options === "success" || options === "error" || options === "info") {
    return { variant: options };
  }
  return options ?? {};
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (message: string, options?: PushToastOptions | ToastVariant) => {
      const { variant = "info", action, durationMs = action ? 8000 : 4000 } =
        normalizeOptions(options);
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, variant, action, durationMs }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    [],
  );

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg " +
              (t.variant === "success"
                ? "border-green-800 bg-green-950/95 text-green-100"
                : t.variant === "error"
                  ? "border-red-800 bg-red-950/95 text-red-100"
                  : "border-app bg-app-surface text-app")
            }
          >
            <p>{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="mt-2 text-xs font-semibold underline underline-offset-2"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
