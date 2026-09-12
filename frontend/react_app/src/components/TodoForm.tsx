import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { DateTimeField } from "@/components/DateTimeField";
import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import { StatusCycleButton, nextStatus } from "@/components/TodoMarks";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  TODO_PRIORITIES,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/labels";
import { type RecurrenceValue } from "@/lib/recurrence";
import type { TagOption } from "@/lib/tags";
import { btnPrimary, propertyControlClass } from "@/lib/uiClasses";
import {
  formatDueCountdown,
  getCalendarDayDiff,
  getPriorityBorderClass,
  getPriorityStripeClass,
  isOverdue,
} from "@/lib/utils";

interface TodoFormProps {
  tags: TagOption[];
  onCreated?: (todo: unknown) => void;
  defaultEventDate?: string;
  defaultDueDate?: string;
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

export function TodoForm({
  tags,
  onCreated,
  defaultEventDate = "",
  defaultDueDate = "",
}: TodoFormProps) {
  const { pushToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("low");
  const [status, setStatus] = useState("todo");
  const [eventDate, setEventDate] = useState(defaultEventDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>("never");
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dueIso = dueDate ? new Date(dueDate).toISOString() : null;
  const overdue = isOverdue(dueIso, status);
  const dueSoon =
    !!dueIso && !overdue && status !== "done" && getCalendarDayDiff(dueIso) === 0;
  const dueLabel = dueIso ? formatDueCountdown(dueIso, status) : null;

  function toggleTag(id: number) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError("");

      const body: Record<string, unknown> = {
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        status,
        recurrence,
      };

      if (eventDate) {
        body.event_date = new Date(eventDate).toISOString();
      }
      if (dueDate) {
        body.due_date = new Date(dueDate).toISOString();
      }
      if (tagIds.length) {
        body.tag_ids = tagIds;
      }

      const res = await apiFetch("/todos/", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to create todo");

      const created = await res.json();
      onCreated?.(created);
      pushToast("Задача создана", "success");

      setTitle("");
      setDescription("");
      setEventDate("");
      setDueDate("");
      setPriority("low");
      setStatus("todo");
      setRecurrence("never");
      setTagIds([]);
    } catch (e) {
      console.error(e);
      setError("Не удалось создать задачу");
      pushToast("Не удалось создать задачу", "error");
    } finally {
      setLoading(false);
    }
  }

  const allTags = [
    ...tags.filter((t) => t.is_system),
    ...tags.filter((t) => !t.is_system),
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className={
        "flex overflow-hidden rounded-lg border bg-app-surface " +
        getPriorityBorderClass(priority)
      }
    >
      <div
        className={
          "shrink-0 self-stretch " +
          "w-1 " +
          getPriorityStripeClass(priority)
        }
        title={`Приоритет: ${getPriorityLabel(priority)}`}
        aria-hidden
      />

      <div className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-4">
        {error && (
          <div className="chip-danger mb-3 rounded-md border px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <StatusCycleButton
            status={status}
            disabled={loading}
            onClick={() => setStatus(nextStatus(status))}
            className="mt-1"
            iconClassName="h-6 w-6"
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="new-todo-title-input" className="sr-only">
              Название задачи
            </label>
            <input
              id="new-todo-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-0 bg-transparent px-0 py-0 text-lg font-semibold text-app placeholder:text-app-subtle focus:ring-0 focus:outline-none"
              placeholder="Название задачи"
              required
            />
            <p className="mt-1 text-xs text-app-subtle">
              {getStatusLabel(status)}
            </p>
          </div>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Описание — по желанию"
          className="mt-3 w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-1 text-sm leading-relaxed text-app placeholder:text-app-subtle focus:border-app focus:bg-app-input focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none"
        />

        <div className="mt-4 space-y-4 border-t border-app pt-4">
          <PropertyField label="Приоритет">
            <div className="flex flex-wrap gap-1">
              {TODO_PRIORITIES.map((value) => {
                const selected = value === priority;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    aria-pressed={selected}
                    className={
                      "inline-flex items-center rounded-md px-2 py-1.5 text-xs transition-colors " +
                      (selected
                        ? "bg-app-surface-muted text-app"
                        : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
                    }
                  >
                    {getPriorityLabel(value)}
                  </button>
                );
              })}
            </div>
          </PropertyField>

          <div className="grid gap-4 sm:grid-cols-2">
            <PropertyField label="Событие" htmlFor="new-todo-event">
              <DateTimeField
                id="new-todo-event"
                value={eventDate}
                onChange={setEventDate}
              />
            </PropertyField>

            <PropertyField label="Срок" htmlFor="new-todo-due">
              {dueLabel && (
                <p
                  className={
                    "px-1.5 text-xs " +
                    (overdue
                      ? "font-medium text-[var(--app-danger)]"
                      : dueSoon
                        ? "font-medium text-app"
                        : "text-app-muted")
                  }
                >
                  {dueLabel}
                </p>
              )}
              <DateTimeField
                id="new-todo-due"
                value={dueDate}
                onChange={setDueDate}
              />
            </PropertyField>
          </div>

          <PropertyField label="Повтор" htmlFor="new-todo-recurrence">
            <RecurrenceSelect
              id="new-todo-recurrence"
              value={recurrence}
              onChange={setRecurrence}
              className={propertyControlClass}
            />
            {recurrence !== "never" && (
              <p className="text-[10px] leading-snug text-app-subtle">
                Повтор от создания до даты события, а если её нет — до срока.
              </p>
            )}
          </PropertyField>

          {allTags.length > 0 ? (
            <PropertyField label="Теги">
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                        (active
                          ? "chip-accent border"
                          : "chip-default border hover:opacity-90")
                      }
                    >
                      #{tag.tag_name}
                    </button>
                  );
                })}
              </div>
            </PropertyField>
          ) : (
            <p className="text-xs text-app-subtle">
              Нет тегов. Добавьте их в{" "}
              <Link to="/settings" className="text-app-accent hover:underline">
                Настройках
              </Link>
              .
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className={btnPrimary + " mt-5 w-full"}
        >
          {loading ? "Создаю..." : "Создать задачу"}
        </button>
      </div>
    </form>
  );
}
