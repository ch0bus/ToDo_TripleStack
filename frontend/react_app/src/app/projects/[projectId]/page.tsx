"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

import { FilterBar } from "@/components/FilterBar";
import { TodoList } from "@/components/TodoList";
import { TodoForm } from "@/components/TodoForm";

interface Todo {
  id: number;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "critical" | "high" | "medium" | "low";
  due_date: string | null;
  recurrence: string;
}

export default function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  useEffect(() => {
    async function loadTodos() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("project", String(projectId));
        if (status) query.set("status", status);
        if (priority) query.set("priority", priority);
        if (search) query.set("search", search);

        const res = await apiFetch(`/todos/?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to load todos");

        const data = (await res.json()) as Todo[];
        setTodos(data);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачи проекта");
      } finally {
        setLoading(false);
      }
    }

    loadTodos();
  }, [projectId, status, priority, search]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {error && (
        <div className="mb-4 rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Задачи проекта #{projectId}</h1>
          <p className="text-xs text-slate-500">
            Фильтруйте по статусу, приоритету и тексту.
          </p>
        </div>
      </div>

      <FilterBar />

      <section className="mt-6 grid gap-6 md:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
        <TodoList todos={todos} loading={loading} />
        <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">
            Новая задача
          </h2>
          <TodoForm
            projectId={projectId}
            onCreated={(todo) => setTodos((prev) => [todo as Todo, ...prev])}
          />
        </aside>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        Всего задач: {todos.length}. Обновлено {formatDateTime(new Date().toISOString())}.
      </p>
    </div>
  );
}
