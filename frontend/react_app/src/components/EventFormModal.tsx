import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { DateTimeField } from "@/components/DateTimeField";
import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLOR_PRESETS,
  type CalendarEvent,
} from "@/lib/events";
import { type RecurrenceValue } from "@/lib/recurrence";
import { isHexColor } from "@/lib/shifts";
import { btnPrimary, propertyControlClass } from "@/lib/uiClasses";
import { toDatetimeLocalValue } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface EventFormModalProps {
  open: boolean;
  event?: CalendarEvent | null;
  defaultStart?: string;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
}

function PropertyField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle"
      >
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EventFormModal({
  open,
  event,
  defaultStart = "",
  onClose,
  onSaved,
}: EventFormModalProps) {
  const { pushToast } = useToast();
  const panelRef = useFocusTrap(open, "#event-title-input");
  const editing = !!event;
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startAt, setStartAt] = useState(
    event ? toDatetimeLocalValue(event.start_at) : defaultStart,
  );
  const [endAt, setEndAt] = useState(
    event ? toDatetimeLocalValue(event.end_at) : "",
  );
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(
    (event?.recurrence as RecurrenceValue) || "never",
  );
  const [color, setColor] = useState(event?.color || DEFAULT_EVENT_COLOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !startAt) return;
    if (!isHexColor(color)) {
      setError("Цвет в формате #RRGGBB.");
      return;
    }
    const startIso = new Date(startAt).toISOString();
    const endIso = endAt ? new Date(endAt).toISOString() : null;
    if (endIso && new Date(endIso) < new Date(startIso)) {
      setError("Конец не может быть раньше начала.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const body = {
        title: trimmed,
        description: description.trim(),
        start_at: startIso,
        end_at: endIso,
        all_day: allDay,
        recurrence,
        color,
      };
      const res = await apiFetch(event ? `/events/${event.id}/` : "/events/", {
        method: event ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save failed");
      const saved = (await res.json()) as CalendarEvent;
      onSaved(saved);
      pushToast(editing ? "Событие сохранено" : "Событие создано", "success");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить событие");
      pushToast("Не удалось сохранить событие", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="overlay-app fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-app bg-app-modal p-4 shadow-app sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="event-form-title" className="text-lg font-semibold text-app">
            {editing ? "Событие" : "Новое событие"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="chip-danger rounded-md border px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <input
            id="event-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-0 bg-transparent px-0 py-0 text-lg font-semibold text-app placeholder:text-app-subtle focus:ring-0 focus:outline-none"
            placeholder="Название события"
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Описание — по желанию"
            className="w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-1 text-sm leading-relaxed text-app placeholder:text-app-subtle focus:border-app focus:bg-app-input focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none"
          />

          <label className="flex items-center gap-2 text-sm text-app">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-app"
            />
            Весь день
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <PropertyField label="Начало" htmlFor="event-start">
              <DateTimeField
                id="event-start"
                value={startAt}
                onChange={setStartAt}
                emptyLabel="Выберите дату"
              />
            </PropertyField>
            <PropertyField label="Конец" htmlFor="event-end">
              <DateTimeField
                id="event-end"
                value={endAt}
                onChange={setEndAt}
              />
            </PropertyField>
          </div>

          <PropertyField label="Повтор" htmlFor="event-recurrence">
            <RecurrenceSelect
              id="event-recurrence"
              value={recurrence}
              onChange={setRecurrence}
              className={propertyControlClass}
            />
          </PropertyField>

          <PropertyField label="Цвет">
            <div className="flex flex-wrap items-center gap-2">
              {EVENT_COLOR_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={value}
                  aria-pressed={color === value}
                  onClick={() => setColor(value)}
                  className={
                    "h-6 w-6 rounded-full border " +
                    (color === value ? "border-app-strong ring-2 ring-[var(--app-accent)]" : "border-app")
                  }
                  style={{ backgroundColor: value }}
                />
              ))}
              <input
                type="color"
                value={isHexColor(color) ? color : DEFAULT_EVENT_COLOR}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-app bg-transparent"
                aria-label="Свой цвет"
              />
            </div>
          </PropertyField>

          <button
            type="submit"
            disabled={loading || !title.trim() || !startAt}
            className={btnPrimary + " w-full"}
          >
            {loading ? "Сохраняю..." : editing ? "Сохранить" : "Создать событие"}
          </button>
        </form>
      </div>
    </div>
  );
}
