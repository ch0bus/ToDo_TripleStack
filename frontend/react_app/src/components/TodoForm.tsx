import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { DateTimeField } from "@/components/DateTimeField";
import { ChoiceChip, PropertyField } from "@/components/FormFields";
import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import { PriorityMark, StatusCycleIcon } from "@/components/TodoMarks";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  TODO_PRIORITIES,
  TODO_STATUSES,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/labels";
import { type RecurrenceValue } from "@/lib/recurrence";
import { useHiddenSystemTags, visibleTagOptions, type TagOption } from "@/lib/tags";
import { btnPrimary, propertyControlClass } from "@/lib/uiClasses";
import {
  formatDueCountdown,
  getCalendarDayDiff,
  isOverdue,
} from "@/lib/utils";

interface TodoFormProps {
  tags: TagOption[];
  onCreated?: (todo: unknown) => void;
  defaultEventDate?: string;
  defaultDueDate?: string;
}

export function TodoForm({
  tags,
  onCreated,
  defaultEventDate = "",
  defaultDueDate = "",
}: TodoFormProps) {
  const { pushToast } = useToast();
  const { hidden } = useHiddenSystemTags();
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

  const allTags = visibleTagOptions(tags, hidden);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="chip-danger rounded-md border px-3 py-2 text-xs">
          {error}
        </div>
      )}

      <div>
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
      </div>

      <PropertyField
        label="Статус"
        mark={<StatusCycleIcon status={status} className="h-4 w-4" />}
      >
        <div className="flex flex-wrap gap-1">
          {TODO_STATUSES.map((value) => (
            <ChoiceChip
              key={value}
              selected={value === status}
              onClick={() => setStatus(value)}
            >
              {getStatusLabel(value)}
            </ChoiceChip>
          ))}
        </div>
      </PropertyField>

      {allTags.length > 0 ? (
        <PropertyField label="Теги">
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <ChoiceChip
                key={tag.id}
                selected={tagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              >
                #{tag.tag_name}
              </ChoiceChip>
            ))}
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

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Описание — по желанию"
        className="w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-1 text-sm leading-relaxed text-app placeholder:text-app-subtle focus:border-app focus:bg-app-input focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none"
      />

      <div className="space-y-4 border-t border-app pt-4">
        <PropertyField
          label="Приоритет"
          mark={<PriorityMark priority={priority} />}
        >
          <div className="flex flex-wrap gap-1">
            {TODO_PRIORITIES.map((value) => (
              <ChoiceChip
                key={value}
                selected={value === priority}
                onClick={() => setPriority(value)}
              >
                {getPriorityLabel(value)}
              </ChoiceChip>
            ))}
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
      </div>

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className={btnPrimary + " w-full"}
      >
        {loading ? "Создаю..." : "Создать задачу"}
      </button>
    </form>
  );
}
