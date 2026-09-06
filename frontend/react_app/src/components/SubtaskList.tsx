"use client";

import { useState } from "react";

interface SubtaskListProps {
  todoId: number;
}

interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

// Пока только фронтовая заглушка: локальное управление списком подзадач
export function SubtaskList({ todoId }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [title, setTitle] = useState("");

  function addSubtask() {
    const t = title.trim();
    if (!t) return;
    setSubtasks((prev) => [
      ...prev,
      { id: Date.now(), title: t, completed: false },
    ]);
    setTitle("");
  }

  function toggle(id: number) {
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s
      )
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">
        Подзадачи (пока только локально)
      </h2>
      <div className="mb-3 flex gap-2 text-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая подзадача..."
          className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1"
        />
        <button
          type="button"
          onClick={addSubtask}
          className="rounded-md bg-slate-700 px-3 py-1 text-xs"
        >
          Добавить
        </button>
      </div>

      <ul className="space-y-1 text-sm">
        {subtasks.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-md bg-slate-800 px-2 py-1"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.completed}
                onChange={() => toggle(s.id)}
                className="h-4 w-4"
              />
              <span
                className={
                  s.completed ? "line-through text-slate-500" : "text-slate-100"
                }
              >
                {s.title}
              </span>
            </div>
          </li>
        ))}

        {!subtasks.length && (
          <li className="text-xs text-slate-500">
            Подзадач пока нет.
          </li>
        )}
      </ul>
    </section>
  );
}
