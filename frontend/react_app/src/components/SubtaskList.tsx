import { useCallback, useEffect, useState, type FormEvent } from "react";

import { apiFetch } from "@/lib/api";

interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

interface SubtaskListProps {
  todoId: number;
}

export function SubtaskList({ todoId }: SubtaskListProps) {
  const [items, setItems] = useState<Subtask[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const base = `/todos/${todoId}/subtasks/`;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch(base);
      if (!res.ok) throw new Error("load failed");
      setItems((await res.json()) as Subtask[]);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить подзадачи");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      const res = await apiFetch(base, {
        method: "POST",
        body: JSON.stringify({ title: trimmed, completed: false }),
      });
      if (!res.ok) throw new Error("create failed");
      const created = (await res.json()) as Subtask;
      setItems((prev) => [created, ...prev]);
      setTitle("");
    } catch (e) {
      console.error(e);
      setError("Не удалось добавить подзадачу");
    }
  }

  async function toggle(subtask: Subtask) {
    try {
      const res = await apiFetch(`${base}${subtask.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !subtask.completed }),
      });
      if (!res.ok) throw new Error("patch failed");
      const updated = (await res.json()) as Subtask;
      setItems((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function remove(id: number) {
    try {
      const res = await apiFetch(`${base}${id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-100">Подзадачи</h2>

      {error && (
        <p className="mb-2 text-xs text-red-300">{error}</p>
      )}

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая подзадача..."
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600"
        >
          Добавить
        </button>
      </form>

      {loading ? (
        <p className="text-xs text-slate-400">Загрузка...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">Подзадач пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-md bg-slate-800 px-2 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={s.completed}
                onChange={() => toggle(s)}
              />
              <span
                className={
                  s.completed ? "flex-1 text-slate-500 line-through" : "flex-1"
                }
              >
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-xs text-red-400 hover:underline"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
