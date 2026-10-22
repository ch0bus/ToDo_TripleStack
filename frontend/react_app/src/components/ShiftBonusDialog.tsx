import { useEffect, useState } from "react";

import { btnDangerGhost, btnPrimary, btnSecondary, inputClass } from "@/lib/uiClasses";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { bonusAmount, type ShiftBonus } from "@/lib/shifts";

export function ShiftBonusDialog({
  open,
  dateLabel,
  bonus,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  open: boolean;
  dateLabel: string;
  bonus: ShiftBonus | null;
  busy?: boolean;
  onSave: (payload: { amount: number; comment: string }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const panelRef = useFocusTrap(open, "input");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const value = bonusAmount(bonus);
    setAmount(value ? String(value) : "");
    setComment(bonus?.comment ?? "");
    setError("");
  }, [open, bonus]);

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
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Укажите сумму больше нуля.");
      return;
    }
    onSave({ amount: parsed, comment: comment.trim() });
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
        aria-labelledby="shift-bonus-title"
      >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) submit();
        }}
      >
        <h2 id="shift-bonus-title" className="text-lg font-semibold text-app">
          Доплата
        </h2>
        <p className="mt-1 text-sm text-app-subtle">{dateLabel}</p>
        {error ? (
          <p className="mt-3 text-sm text-[var(--app-danger)]">{error}</p>
        ) : null}
        <label className="mt-4 block text-sm text-app-muted">
          Сумма, ₽
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass + " mt-1"}
            autoComplete="off"
            required
          />
        </label>
        <label className="mt-3 block text-sm text-app-muted">
          Комментарий
          <input
            type="text"
            value={comment}
            maxLength={200}
            onChange={(event) => setComment(event.target.value)}
            className={inputClass + " mt-1"}
            autoComplete="off"
          />
        </label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {bonus && onDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className={btnDangerGhost + " self-start"}
            >
              Удалить
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        </div>
      </form>
      </div>
    </div>
  );
}
