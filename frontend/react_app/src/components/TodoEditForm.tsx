import { useEffect, useState, type FormEvent } from "react";

import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import { apiFetch } from "@/lib/api";
import { type RecurrenceValue } from "@/lib/recurrence";
import type { TagOption } from "@/lib/tags";
import { toDatetimeLocalValue } from "@/lib/utils";

export interface TodoEditData {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string | null;
  recurrence: string;
  tags?: { id: number; tag_name: string }[];
}

interface TodoEditFormProps {
  todo: TodoEditData;
  tags: TagOption[];
  onSaved: (todo: TodoEditData) => void;
}

export function TodoEditForm({ todo, tags, onSaved }: TodoEditFormProps) {
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
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTitle(todo.title);
    setDescription(todo.description ?? "");
    setPriority(todo.priority);
    setStatus(todo.status);
    setDueDate(toDatetimeLocalValue(todo.due_date));
    setRecurrence((todo.recurrence as RecurrenceValue) || "never");
    setTagIds(todo.tags?.map((t) => t.id) ?? []);
  }, [todo]);

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
      setSuccess("");

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
      setSuccess("Изменения сохранены");
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить задачу");
    } finally {
      setLoading(false);
    }
  }

  const systemTags = tags.filter((t) => t.is_system);
  const userTags = tags.filter((t) => !t.is_system);

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-sm"
    >
      <h2 className="text-sm font-semibold text-slate-100">Редактирование</h2>

      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/40 px-2 py-1 text-xs text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-800 bg-green-900/30 px-2 py-1 text-xs text-green-200">
          {success}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-slate-400">Заголовок</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-400">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Приоритет</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Срок</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Повторение</label>
          <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-slate-400">Теги</span>
          <div className="flex flex-wrap gap-3">
            {[...systemTags, ...userTags].map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-1 text-xs text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={tagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
                {tag.tag_name}
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
      >
        {loading ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}
