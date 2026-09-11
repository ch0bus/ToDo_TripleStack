import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { MetaChip } from "@/components/MetaChip";
import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import {
  PrioritySelect,
  StatusSelect,
} from "@/components/StatusPrioritySelects";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import { getPriorityLabel } from "@/lib/labels";
import { type RecurrenceValue } from "@/lib/recurrence";
import type { TagOption } from "@/lib/tags";
import { btnPrimary, inputClass } from "@/lib/uiClasses";
import {
  formatDueLabel,
  getPriorityDotClass,
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
}

interface TodoEditFormProps {
  todo: TodoEditData;
  tags: TagOption[];
  onSaved: (todo: TodoEditData) => void;
  children?: ReactNode;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h3>
  );
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

  const overdue = isOverdue(dueDate ? new Date(dueDate).toISOString() : null, status);

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

  const heroInputClass =
    "w-full border-0 bg-transparent px-0 py-0 text-xl font-semibold leading-snug text-slate-50 placeholder:text-slate-600 focus:ring-0 focus:outline-none sm:text-2xl";

  const descClass =
    "w-full resize-y rounded-lg border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/80 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-col">
      <header className="border-b border-slate-700/40 px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            <span
              className={
                "h-2 w-2 rounded-full " + getPriorityDotClass(priority)
              }
              aria-hidden
            />
            {getPriorityLabel(priority)}
          </span>
          {overdue && <MetaChip tone="danger">Просрочено</MetaChip>}
          {todo.due_date && !overdue && dueDate && (
            <MetaChip>Срок: {formatDueLabel(new Date(dueDate).toISOString())}</MetaChip>
          )}
          {todo.subtasks_summary && todo.subtasks_summary.total > 0 && (
            <MetaChip>
              {todo.subtasks_summary.done}/{todo.subtasks_summary.total} подзадач
            </MetaChip>
          )}
        </div>

        <label htmlFor="todo-title" className="sr-only">
          Заголовок
        </label>
        <input
          id="todo-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={heroInputClass}
          placeholder="Название задачи"
          required
        />

        <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto sm:gap-3">
          <StatusSelect value={status} onChange={setStatus} inline />
          <PrioritySelect value={priority} onChange={setPriority} inline />
        </div>
      </header>

      <div className="space-y-6 px-4 py-5 sm:px-5">
        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <section className="space-y-2">
          <SectionTitle>Описание</SectionTitle>
          <textarea
            id="todo-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Добавьте детали, ссылки, чеклист…"
            className={descClass}
          />
        </section>

        <section className="space-y-3">
          <SectionTitle>Срок и повторение</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="todo-due"
                className="text-xs text-slate-400"
              >
                Срок выполнения
              </label>
              <input
                id="todo-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Повторение</label>
              <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
              <p className="text-[10px] leading-snug text-slate-500">
                Правило сохраняется; автосоздание следующих экземпляров пока
                не реализовано.
              </p>
            </div>
          </div>
        </section>

        {allTags.length > 0 && (
          <section className="space-y-2">
            <SectionTitle>Теги</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                      (active
                        ? "border-blue-600/60 bg-blue-950/50 text-blue-200"
                        : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200")
                    }
                  >
                    #{tag.tag_name}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {children}

      <footer className="sticky bottom-0 border-t border-slate-700/50 bg-slate-900/95 px-4 py-3 backdrop-blur sm:static sm:bg-transparent sm:px-5 sm:py-4">
        <button
          type="submit"
          disabled={loading}
          className={btnPrimary + " w-full sm:w-auto"}
        >
          {loading ? "Сохранение..." : "Сохранить изменения"}
        </button>
      </footer>
    </form>
  );
}
