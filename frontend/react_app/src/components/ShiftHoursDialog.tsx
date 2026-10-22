import { useEffect, useState } from "react";

import { btnPrimary, btnSecondary, inputClass } from "@/lib/uiClasses";
import { useFocusTrap } from "@/lib/useFocusTrap";

export function ShiftHoursDialog({
  open,
  dateLabel,
  hours,
  busy,
  onSave,
  onCancel,
}: {
  open: boolean;
  dateLabel: string;
  hours: number;
  busy?: boolean;
  onSave: (hours: number) => void;
  onCancel: () => void;
}) {
  const panelRef = useFocusTrap(open, "input");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(hours ? String(hours) : "");
    setError("");
  }, [open, hours]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  function submit() {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0.25 || parsed > 24) {
      setError("Часы смены — от 0.25 до 24.");
      return;
    }
    onSave(parsed);
  }

  return (
    <div
      className="overlay-app fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-xl border border-app bg-app-modal p-5 shadow-app"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-hours-title"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) submit();
          }}
        >
          <h2 id="shift-hours-title" className="text-lg font-semibold text-app">
            Часы смены
          </h2>
          <p className="mt-1 text-sm text-app-subtle">{dateLabel}</p>
          {error ? (
            <p className="mt-3 text-sm text-[var(--app-danger)]">{error}</p>
          ) : null}
          <label className="mt-4 block text-sm text-app-muted">
            Часы в этот день
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={inputClass + " mt-1"}
              autoComplete="off"
              required
            />
          </label>
          <p className="mt-2 text-xs text-app-subtle">
            Только выбранный день. Тип смены не меняется.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className={btnSecondary + " disabled:opacity-50"}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={busy}
              className={btnPrimary + " disabled:opacity-50"}
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
