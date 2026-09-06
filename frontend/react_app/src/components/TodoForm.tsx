"use client";

import { useState, FormEvent } from "react";

import { apiFetch } from "@/lib/api";

interface TodoFormProps {
  projectId: number;
  onCreated?: (todo: unknown) => void;
}

export function TodoForm({ projectId, onCreated }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError("");

      const body: any = {
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        status,
        project: projectId,
      };

      if (dueDate) {
        body.due_date = new Date(dueDate).toISOString();
      }

      const res = await apiFetch("/todos/", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to create todo");

      const created = await res.json();
      if (onCreated) onCreated(created);

      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      setStatus("todo");
    } catch (e) {
      console.error(e);
      setError("Не удалось создать задачу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      {error && (
        <div className="rounded-md bg-red-900/40 border border-red-700 px-2 py-1 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-slate-300">Заголовок</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1
                     text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2
                     focus:ring-blue-500"
          placeholder="Новая задача..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-300">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1
                     text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2
                     focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[120px] space-y-1">
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

        <div className="flex-1 min-w-[120px] space-y-1">
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

      <div className="space-y-1">
        <label className="text-xs text-slate-300">Срок</label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium
                   hover:bg-blue-500 active:bg-blue-700 transition-colors
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Создаю..." : "Создать задачу"}
      </button>
    </form>
  );
}
