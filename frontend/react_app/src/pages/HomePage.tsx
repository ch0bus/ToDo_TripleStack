import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { FilterBar } from "@/components/FilterBar";
import { TodoForm } from "@/components/TodoForm";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export function HomePage() {
  const [searchParams] = useSearchParams();
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasToken = !!getAccessToken();
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }

    async function loadTodos() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        if (status) query.set("status", status);
        if (priority) query.set("priority", priority);
        if (tag) query.set("tag", tag);
        if (search) query.set("search", search);

        const qs = query.toString();
        const res = await apiFetch(qs ? `/todos/?${qs}` : "/todos/");
        if (!res.ok) throw new Error("Failed to load todos");

        setTodos((await res.json()) as TodoRow[]);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачи");
      } finally {
        setLoading(false);
      }
    }

    loadTodos();
  }, [hasToken, status, priority, tag, search]);

  if (!hasToken) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Inbox задач</h1>
        <p className="mb-6 text-sm text-slate-400">
          Войдите, чтобы видеть и создавать задачи.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-xs text-slate-500">
          Фильтры по статусу, приоритету, тегу и тексту.
        </p>
      </div>

      <FilterBar />

      <section className="mt-6 grid gap-6 md:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
        <TodoList todos={todos} loading={loading} />
        <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">
            Новая задача
          </h2>
          <TodoForm
            onCreated={(todo) => setTodos((prev) => [todo as TodoRow, ...prev])}
          />
        </aside>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        Всего задач: {todos.length}. Обновлено{" "}
        {formatDateTime(new Date().toISOString())}.
      </p>
    </div>
  );
}
