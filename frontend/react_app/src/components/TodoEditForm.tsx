import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import {
  StatusCycleButton,
  StatusCycleIcon,
  nextStatus,
} from "@/components/TodoMarks";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  TODO_PRIORITIES,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/labels";
import { type RecurrenceValue } from "@/lib/recurrence";
import type { TagOption } from "@/lib/tags";
import { btnPrimary } from "@/lib/uiClasses";
import {
  formatDateStamp,
  formatDueCountdown,
  getCalendarDayDiff,
  getPriorityBorderClass,
  getPriorityStripeClass,
  isOverdue,
  toDatetimeLocalValue,
} from "@/lib/utils";

export interface TodoEditData {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string | null;
  recurrence: string;
  tags?: { id: number; tag_name: string }[];
  subtasks_summary?: { done: number; total: number };
  created_at?: string;
  completed_at?: string | null;
}

interface TodoEditFormProps {
  todo: TodoEditData;
  tags: TagOption[];
  onSaved: (todo: TodoEditData) => void;
  children?: ReactNode;
}

const propertyControlClass =
  "w-full cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-1.5 text-sm text-app hover:bg-app-surface-muted focus:bg-app-surface-muted focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none";

function SideProperty({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
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

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function TodoEditForm({
  todo,
  tags,
  onSaved,
  children,
}: TodoEditFormProps) {
  const { pushToast } = useToast();
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [priority, setPriority] = useState(todo.priority);
  const [status, setStatus] = useState(todo.status);
  const [dueDate, setDueDate] = useState(() => toDatetimeLocalValue(todo.due_date));
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(
    (todo.recurrence as RecurrenceValue) || "never",
  );
  const [tagIds, setTagIds] = useState<number[]>(
    () => todo.tags?.map((t) => t.id) ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(todo.title);
    setDescription(todo.description ?? "");
    setPriority(todo.priority);
    setStatus(todo.status);
    setDueDate(toDatetimeLocalValue(todo.due_date));
    setRecurrence((todo.recurrence as RecurrenceValue) || "never");
    setTagIds(todo.tags?.map((t) => t.id) ?? []);
  }, [todo.id]);

  const dueIso = dueDate ? new Date(dueDate).toISOString() : null;
  const overdue = isOverdue(dueIso, status);
  const dueSoon =
    !!dueIso && !overdue && status !== "done" && getCalendarDayDiff(dueIso) === 0;
  const dueLabel = dueIso ? formatDueCountdown(dueIso, status) : "без срока";
  const isDone = status === "done";

  const dirty =
    title !== todo.title ||
    description !== (todo.description ?? "") ||
    priority !== todo.priority ||
    status !== todo.status ||
    dueDate !== toDatetimeLocalValue(todo.due_date) ||
    recurrence !== ((todo.recurrence as RecurrenceValue) || "never") ||
    !sameIdSet(tagIds, todo.tags?.map((t) => t.id) ?? []);

  function toggleTag(id: number) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !dirty) return;

    try {
      setLoading(true);
      setError("");

      const body: Record<string, unknown> = {
        title: trimmed,
        description: description.trim(),
        priority,
        status,
        recurrence,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        tag_ids: tagIds,
      };

      const res = await apiFetch(`/todos/${todo.id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update todo");

      const updated = (await res.json()) as TodoEditData;
      setTitle(updated.title);
      setDescription(updated.description ?? "");
      setPriority(updated.priority);
      setStatus(updated.status);
      setDueDate(toDatetimeLocalValue(updated.due_date));
      setRecurrence((updated.recurrence as RecurrenceValue) || "never");
      setTagIds(updated.tags?.map((t) => t.id) ?? []);
      onSaved(updated);
      pushToast("Изменения сохранены", "success");
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить задачу");
      pushToast("Не удалось сохранить задачу", "error");
    } finally {
      setLoading(false);
    }
  }

  const systemTags = tags.filter((t) => t.is_system);
  const userTags = tags.filter((t) => !t.is_system);
  const allTags = [...systemTags, ...userTags];

  return (
    <form
      onSubmit={handleSubmit}
      className={
        "flex min-w-0 overflow-hidden rounded-xl border bg-app-surface shadow-app " +
        getPriorityBorderClass(priority)
      }
    >
      {priority !== "critical" && (
        <div
          className={
            "shrink-0 self-stretch " +
            "w-1 " +
            getPriorityStripeClass(priority)
          }
          title={`Приоритет: ${getPriorityLabel(priority)}`}
          aria-hidden
        />
      )}

      <div className="grid min-w-0 flex-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <header className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <StatusCycleButton
                status={status}
                disabled={loading}
                onClick={() => setStatus(nextStatus(status))}
                className="mt-1"
                iconClassName="h-6 w-6"
              />
              <label htmlFor="todo-title" className="sr-only">
                Заголовок
              </label>
              <input
                id="todo-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={
                  "min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-xl font-semibold leading-snug placeholder:text-app-subtle focus:ring-0 focus:outline-none sm:text-2xl " +
                  (isDone ? "text-app-subtle line-through" : "text-app")
                }
                placeholder="Название задачи"
                required
              />
            </div>
          </header>

          <div className="px-4 pb-5 sm:px-5">
            {error && (
              <div className="chip-danger mb-4 rounded-md border px-3 py-2 text-xs">
                {error}
              </div>
            )}
            <section>
              <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                Описание
              </h3>
              <textarea
                id="todo-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                placeholder="Добавьте детали, ссылки, чеклист…"
                className="w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-1 text-sm leading-relaxed text-app placeholder:text-app-subtle focus:border-app focus:bg-app-input focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none"
              />
            </section>
          </div>

          {children}
        </div>

        <aside className="flex flex-col border-t border-app bg-app-surface-muted/40 lg:border-l lg:border-t-0">
          <div className="flex flex-1 flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5">
            <SideProperty label="Статус">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStatus(nextStatus(status))}
                className="group/status flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-app hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] disabled:opacity-40"
              >
                <StatusCycleIcon status={status} />
                {getStatusLabel(status)}
              </button>
            </SideProperty>

            <SideProperty label="Приоритет">
              <div className="flex flex-col gap-0.5">
                {TODO_PRIORITIES.map((value) => {
                  const selected = value === priority;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriority(value)}
                      aria-pressed={selected}
                      className={
                        "inline-flex items-center rounded-md px-1.5 py-1.5 text-left text-xs transition-colors " +
                        (selected
                          ? "bg-app-surface text-app shadow-sm"
                          : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
                      }
                    >
                      {getPriorityLabel(value)}
                    </button>
                  );
                })}
              </div>
            </SideProperty>

            <SideProperty label="Срок" htmlFor="todo-due">
              <p
                title={dueIso ? new Date(dueIso).toLocaleString() : undefined}
                className={
                  "px-1.5 text-sm " +
                  (overdue
                    ? "font-medium text-[var(--app-danger)]"
                    : dueSoon
                      ? "font-medium text-app"
                      : "text-app-muted")
                }
              >
                {dueLabel}
              </p>
              <input
                id="todo-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={propertyControlClass}
              />
            </SideProperty>

            <SideProperty label="Повтор" htmlFor="todo-recurrence">
              <RecurrenceSelect
                id="todo-recurrence"
                value={recurrence}
                onChange={setRecurrence}
                className={propertyControlClass}
              />
              {recurrence !== "never" && (
                <p className="px-1.5 text-[10px] leading-snug text-app-subtle">
                  Повтор ставится от даты создания до срока с выбранным шагом.
                </p>
              )}
            </SideProperty>

            {todo.created_at && (
              <SideProperty label="Создана">
                <p
                  title={new Date(todo.created_at).toLocaleString()}
                  className="px-1.5 text-sm text-app-muted"
                >
                  {formatDateStamp(todo.created_at)}
                </p>
              </SideProperty>
            )}

            {status === "done" && (
              <SideProperty label="Готово">
                <p
                  title={
                    todo.completed_at
                      ? new Date(todo.completed_at).toLocaleString()
                      : undefined
                  }
                  className="px-1.5 text-sm text-app-muted"
                >
                  {todo.status === "done" && todo.completed_at
                    ? formatDateStamp(todo.completed_at)
                    : todo.status === "done"
                      ? "не зафиксирована"
                      : "запишется при сохранении"}
                </p>
              </SideProperty>
            )}

            {allTags.length > 0 && (
              <SideProperty label="Теги">
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
              </SideProperty>
            )}
          </div>

          {dirty && (
            <div className="sticky bottom-0 mt-auto border-t border-app bg-app-header px-4 py-3 backdrop-blur lg:static lg:bg-transparent">
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className={btnPrimary + " w-full"}
              >
                {loading ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}
