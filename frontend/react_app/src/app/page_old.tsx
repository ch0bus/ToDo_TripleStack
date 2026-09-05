"use client";

import { useState, FormEvent } from "react";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setTodos(prev => [
      ...prev,
      { id: Date.now(), title: trimmed, completed: false },
    ]);
    setTitle("");
  }

  function toggleTodo(id: number) {
    setTodos(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  }

  function deleteTodo(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          ToDo App
        </h1>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Новая задача..."
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2
                       text-sm placeholder:text-slate-500 focus:outline-none
                       focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
                       hover:bg-blue-500 active:bg-blue-700 transition-colors"
          >
            Добавить
          </button>
        </form>

        <ul className="space-y-2">
          {todos.length === 0 && (
            <li className="text-sm text-slate-400">
              Пока задач нет. Добавь первую 🙂
            </li>
          )}

          {todos.map(todo => (
            <li
              key={todo.id}
              className="flex items-center justify-between rounded-md bg-slate-800 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="h-4 w-4"
                />
                <span
                  className={
                    "text-sm " +
                    (todo.completed ? "line-through text-slate-500" : "")
                  }
                >
                  {todo.title}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
