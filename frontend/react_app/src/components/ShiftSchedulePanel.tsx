import { useState } from "react";

import {
  formatKindMeta,
  isHexColor,
  type ShiftCalendar,
  type ShiftKind,
  type ShiftKindWrite,
  type ShiftLayer,
  type ShiftPattern,
} from "@/lib/shifts";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/uiClasses";

interface ShiftSchedulePanelProps {
  calendar: ShiftCalendar;
  canDeleteCalendar: boolean;
  layers: ShiftLayer[];
  activeLayer: ShiftLayer;
  kinds: ShiftKind[];
  pattern: ShiftPattern;
  onActiveLayerChange: (id: number) => void;
  onRenameLayer: (id: number, name: string) => Promise<void>;
  onRenameCalendar: (name: string) => Promise<void>;
  onDeleteCalendar: () => Promise<void>;
  onCreateKind: (payload: ShiftKindWrite) => Promise<void>;
  onUpdateKind: (id: number, payload: Omit<ShiftKindWrite, "layer_id">) => Promise<void>;
  onDeleteKind: (id: number) => Promise<void>;
  onSavePattern: (
    startDate: string,
    endDate: string | null,
    kindIds: Array<number | null>,
  ) => Promise<void>;
}

const compactInput = inputClass + " w-24 shrink-0";

export function ShiftSchedulePanel({
  calendar,
  canDeleteCalendar,
  layers,
  activeLayer,
  kinds,
  pattern,
  onActiveLayerChange,
  onRenameLayer,
  onRenameCalendar,
  onDeleteCalendar,
  onCreateKind,
  onUpdateKind,
  onDeleteKind,
  onSavePattern,
}: ShiftSchedulePanelProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [durationHours, setDurationHours] = useState("8");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [layerName, setLayerName] = useState(activeLayer.name);
  const [calendarName, setCalendarName] = useState(calendar.name);
  const [startDate, setStartDate] = useState(pattern.start_date ?? "");
  const [endDate, setEndDate] = useState(pattern.end_date ?? "");
  const [slots, setSlots] = useState<Array<number | null>>(
    () => pattern.slots.map((s) => s.kind_id),
  );
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#2563eb");
  const [editHours, setEditHours] = useState("8");
  const [editBreak, setEditBreak] = useState("0");
  const [editRate, setEditRate] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function parseKindFields(
    hoursRaw: string,
    breakRaw: string,
    rateRaw: string,
  ): { duration_hours: number; break_minutes: number; hourly_rate: number } | null {
    const duration_hours = Number(hoursRaw.replace(",", "."));
    const break_minutes = Number(breakRaw);
    const hourly_rate = Number(rateRaw.replace(",", "."));
    if (
      !Number.isFinite(duration_hours) ||
      duration_hours < 0.25 ||
      duration_hours > 24
    ) {
      setError("Часы смены — от 0.25 до 24.");
      return null;
    }
    if (
      !Number.isFinite(break_minutes) ||
      break_minutes < 0 ||
      break_minutes > 480 ||
      !Number.isInteger(break_minutes)
    ) {
      setError("Перерыв — целое число от 0 до 480 минут.");
      return null;
    }
    if (!Number.isFinite(hourly_rate) || hourly_rate < 0) {
      setError("Ставка не может быть отрицательной.");
      return null;
    }
    return { duration_hours, break_minutes, hourly_rate };
  }

  function startEdit(kind: ShiftKind) {
    setEditId(kind.id);
    setEditName(kind.name);
    setEditColor(kind.color);
    setEditHours(String(Number(kind.duration_hours)));
    setEditBreak(String(kind.break_minutes ?? 0));
    setEditRate(String(Number(kind.hourly_rate)));
    setError("");
  }

  async function handleCreateKind() {
    const trimmed = name.trim();
    if (!trimmed || !isHexColor(color)) return;
    const fields = parseKindFields(durationHours, breakMinutes, hourlyRate);
    if (!fields) return;
    try {
      setBusy(true);
      setError("");
      await onCreateKind({
        layer_id: activeLayer.id,
        name: trimmed,
        color,
        ...fields,
      });
      setName("");
    } catch {
      setError("Не удалось создать тип смены");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateKind() {
    if (editId == null) return;
    const trimmed = editName.trim();
    if (!trimmed || !isHexColor(editColor)) return;
    const fields = parseKindFields(editHours, editBreak, editRate);
    if (!fields) return;
    try {
      setBusy(true);
      setError("");
      await onUpdateKind(editId, { name: trimmed, color: editColor, ...fields });
      setEditId(null);
    } catch {
      setError("Не удалось сохранить тип смены");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePattern() {
    if (!startDate) {
      setError("Укажите дату начала цикла");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("Конец цикла не раньше начала");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await onSavePattern(startDate, endDate || null, slots);
    } catch {
      setError("Не удалось сохранить шаблон");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs text-app-muted sm:max-w-xs">
          Календарь
          <input
            type="text"
            value={calendarName}
            maxLength={40}
            onChange={(e) => setCalendarName(e.target.value)}
            onBlur={() => {
              const trimmed = calendarName.trim();
              if (!trimmed || trimmed === calendar.name) {
                setCalendarName(calendar.name);
                return;
              }
              void onRenameCalendar(trimmed).catch(() => {
                setCalendarName(calendar.name);
              });
            }}
            className={inputClass + " mt-1"}
          />
        </label>
        {canDeleteCalendar && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDeleteCalendar()}
            className="text-xs text-[var(--app-danger)] hover:underline disabled:opacity-40"
          >
            Удалить календарь
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onActiveLayerChange(layer.id)}
            className={
              "rounded-md px-2.5 py-1 text-xs " +
              (layer.id === activeLayer.id
                ? "bg-app-surface-muted text-app"
                : "text-app-subtle hover:bg-app-surface-muted")
            }
          >
            {layer.position === 0 ? "↖ " : "↘ "}
            {layer.name}
          </button>
        ))}
        <input
          type="text"
          value={layerName}
          maxLength={40}
          aria-label="Название слоя"
          onChange={(e) => setLayerName(e.target.value)}
          onBlur={() => {
            const trimmed = layerName.trim();
            if (!trimmed || trimmed === activeLayer.name) {
              setLayerName(activeLayer.name);
              return;
            }
            void onRenameLayer(activeLayer.id, trimmed).catch(() => {
              setLayerName(activeLayer.name);
            });
          }}
          className={inputClass + " h-8 w-36 py-1 text-xs"}
        />
      </div>

      <div className="space-y-4 border-t border-app pt-4">
          {error && (
            <p className="text-xs text-[var(--app-danger)]">{error}</p>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
              Типы смен
            </h3>
            {kinds.length > 0 && (
              <ul className="space-y-2">
                {kinds.map((kind) => (
                  <li key={kind.id} className="space-y-2 text-sm">
                    {editId === kind.id ? (
                      <div className="space-y-2 rounded-md border border-app p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-9 w-10 cursor-pointer rounded border border-app bg-app-input p-0.5"
                            aria-label="Цвет смены"
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputClass + " min-w-0 flex-1"}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs text-app-muted">
                            Часы
                            <input
                              type="number"
                              min={0.25}
                              max={24}
                              step={0.25}
                              value={editHours}
                              onChange={(e) => setEditHours(e.target.value)}
                              className={compactInput + " mt-1"}
                            />
                          </label>
                          <label className="text-xs text-app-muted">
                            Перерыв, мин
                            <input
                              type="number"
                              min={0}
                              max={480}
                              step={1}
                              value={editBreak}
                              onChange={(e) => setEditBreak(e.target.value)}
                              className={compactInput + " mt-1"}
                            />
                          </label>
                          <label className="text-xs text-app-muted">
                            ₽/час
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className={compactInput + " mt-1"}
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy || !editName.trim()}
                            onClick={() => void handleUpdateKind()}
                            className={btnSecondary + " py-1 text-xs"}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditId(null)}
                            className="rounded-md px-3 py-1 text-xs text-app-muted hover:bg-app-surface-muted"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex min-w-0 items-start gap-2">
                          <span
                            className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                            style={{ backgroundColor: kind.color }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-app">{kind.name}</span>
                            <span className="block text-xs text-app-subtle">
                              {formatKindMeta(kind)}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(kind)}
                            className="text-xs text-app-muted hover:underline disabled:opacity-40"
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onDeleteKind(kind.id)}
                            className="text-xs text-[var(--app-danger)] hover:underline disabled:opacity-40"
                          >
                            Удалить
                          </button>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2">
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
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-app-muted">
                  Часы
                  <input
                    type="number"
                    min={0.25}
                    max={24}
                    step={0.25}
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className={compactInput + " mt-1"}
                  />
                </label>
                <label className="text-xs text-app-muted">
                  Перерыв, мин
                  <input
                    type="number"
                    min={0}
                    max={480}
                    step={1}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    className={compactInput + " mt-1"}
                  />
                </label>
                <label className="text-xs text-app-muted">
                  ₽/час
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className={compactInput + " mt-1"}
                  />
                </label>
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
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
              Шаблон цикла
            </h3>
            <div className="flex flex-wrap gap-3">
              <label className="block text-xs text-app-muted">
                Начало цикла
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass + " mt-1"}
                />
              </label>
              <label className="block text-xs text-app-muted">
                Конец цикла
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass + " mt-1"}
                />
              </label>
            </div>
            <p className="text-[11px] text-app-subtle">
              Пустой конец — цикл без ограничения.
            </p>
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
    </section>
  );
}
