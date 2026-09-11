import { useState, type FormEvent } from "react";

import { Link } from "react-router-dom";

import { RecurrenceSelect } from "@/components/RecurrenceSelect";
import { apiFetch } from "@/lib/api";
import { type RecurrenceValue } from "@/lib/recurrence";
import type { TagOption } from "@/lib/tags";

interface TodoFormProps {
  tags: TagOption[];
  onCreated?: (todo: unknown) => void;
}

export function TodoForm({ tags, onCreated }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceValue>("never");
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      setStatus("todo");
      setRecurrence("never");
      setTagIds([]);
    } catch (e) {
      console.error(e);
      setError("Не удалось создать задачу");
    } finally {
      setLoading(false);
    }
  }

  const systemTags = tags.filter((t) => t.is_system);
  const userTags = tags.filter((t) => !t.is_system);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/40 px-2 py-1 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-slate-300">Заголовок</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Новая задача..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-300">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[120px] flex-1 space-y-1">
          <label className="text-xs text-slate-300">Приоритет</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          >
            <option value="critical">Критический</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
        </div>

        <div className="min-w-[120px] flex-1 space-y-1">
          <label className="text-xs text-slate-300">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          >
            <option value="todo">TODO</option>
            <option value="in_progress">В работе</option>
            <option value="done">Готово</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-xs text-slate-300">Срок</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          />
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-xs text-slate-300">Повторение</label>
          <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs text-slate-300">Теги</span>
          {systemTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {systemTags.map((tag) => (
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
          )}
          {userTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userTags.map((tag) => (
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
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Нет тегов. Добавьте их в{" "}
          <Link to="/settings" className="text-blue-400 hover:underline">
            Настройках
          </Link>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Создаю..." : "Создать задачу"}
      </button>
    </form>
  );
}
