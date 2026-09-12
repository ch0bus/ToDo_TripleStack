import { useState } from "react";

import type {
  PaintTool,
  ShiftKind,
  ShiftPattern,
} from "@/lib/shifts";
import { isHexColor } from "@/lib/shifts";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/uiClasses";

interface ShiftSchedulePanelProps {
  kinds: ShiftKind[];
  pattern: ShiftPattern;
  paint: PaintTool;
  onPaintChange: (tool: PaintTool) => void;
  onCreateKind: (name: string, color: string) => Promise<void>;
  onDeleteKind: (id: number) => Promise<void>;
  onSavePattern: (startDate: string, kindIds: Array<number | null>) => Promise<void>;
}

function toolActive(paint: PaintTool, tool: PaintTool): boolean {
  if (paint.type !== tool.type) return false;
  if (paint.type === "kind" && tool.type === "kind") {
    return paint.id === tool.id;
  }
  return true;
}

export function ShiftSchedulePanel({
  kinds,
  pattern,
  paint,
  onPaintChange,
  onCreateKind,
  onDeleteKind,
  onSavePattern,
}: ShiftSchedulePanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [startDate, setStartDate] = useState(pattern.start_date ?? "");
  const [slots, setSlots] = useState<Array<number | null>>(
    () => pattern.slots.map((s) => s.kind_id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function syncPatternFromProps() {
    setStartDate(pattern.start_date ?? "");
    setSlots(pattern.slots.map((s) => s.kind_id));
  }

  async function handleCreateKind() {
    const trimmed = name.trim();
    if (!trimmed || !isHexColor(color)) return;
    try {
      setBusy(true);
      setError("");
      await onCreateKind(trimmed, color);
      setName("");
    } catch {
      setError("Не удалось создать тип смены");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePattern() {
    if (!startDate) {
      setError("Укажите дату начала цикла");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await onSavePattern(startDate, slots);
    } catch {
      setError("Не удалось сохранить шаблон");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-app bg-app-surface px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-app">График смен</h2>
        <button
          type="button"
          onClick={() => {
            if (!open) syncPatternFromProps();
            setOpen((v) => !v);
          }}
          className="text-xs text-app-accent hover:underline"
        >
          {open ? "Скрыть настройки" : "Типы и шаблон"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onPaintChange({ type: "select" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "select" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          Выбор дня
        </button>
        {kinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            onClick={() => onPaintChange({ type: "kind", id: kind.id })}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs " +
              (toolActive(paint, { type: "kind", id: kind.id })
                ? "bg-app-surface-muted text-app"
                : "text-app-subtle hover:bg-app-surface-muted")
            }
          >
            <span
              className="h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: kind.color }}
              aria-hidden
            />
            {kind.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPaintChange({ type: "off" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "off" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          Выходной
        </button>
        <button
          type="button"
          onClick={() => onPaintChange({ type: "pattern" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "pattern" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          По шаблону
        </button>
      </div>

      {kinds.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-app-subtle">
          {kinds.map((kind) => (
            <li key={kind.id} className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: kind.color }}
                aria-hidden
              />
              {kind.name}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-app pt-4">
          {error && (
            <p className="text-xs text-[var(--app-danger)]">{error}</p>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
              Типы смен
            </h3>
            {kinds.length > 0 && (
              <ul className="space-y-1.5">
                {kinds.map((kind) => (
                  <li
                    key={kind.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                        style={{ backgroundColor: kind.color }}
                      />
                      <span className="truncate text-app">{kind.name}</span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDeleteKind(kind.id)}
                      className="text-xs text-[var(--app-danger)] hover:underline disabled:opacity-40"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border border-app bg-app-input p-0.5"
                aria-label="Цвет смены"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название, например Ночь"
                className={inputClass + " min-w-0 flex-1"}
              />
              <button
                type="button"
                disabled={busy || !name.trim()}
                onClick={() => void handleCreateKind()}
                className={btnSecondary + " shrink-0 py-2"}
              >
                Добавить
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
              Шаблон цикла
            </h3>
            <label className="block text-xs text-app-muted">
              Начало цикла
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass + " mt-1"}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((kindId, index) => {
                const kind = kinds.find((k) => k.id === kindId);
                return (
                  <span
                    key={`${index}-${kindId ?? "off"}`}
                    className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 text-xs text-app"
                  >
                    {kind ? (
                      <>
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: kind.color }}
                        />
                        {kind.name}
                      </>
                    ) : (
                      "Выходной"
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSlots((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="text-app-subtle hover:text-[var(--app-danger)]"
                      aria-label="Убрать слот"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {kinds.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setSlots((prev) => [...prev, kind.id])}
                  className={btnSecondary + " py-1 text-xs"}
                >
                  + {kind.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSlots((prev) => [...prev, null])}
                className={btnSecondary + " py-1 text-xs"}
              >
                + Выходной
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSavePattern()}
              className={btnPrimary}
            >
              Сохранить шаблон
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
