"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/Header";
import { SubtaskList } from "@/components/SubtaskList";

interface TodoDetail {
  id: number;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "critical" | "high" | "medium" | "low";
  due_date: string | null;
  recurrence: string;
  project?: number | null;
}

export default function TodoDetailPage({
  params,
}: {
  params: { todoId: string };
}) {
  const todoId = Number(params.todoId);

  const [todo, setTodo] = useState<TodoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTodo() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch(`/todos/${todoId}/`);
        if (!res.ok) throw new Error("Failed to load todo");
        const data = (await res.json()) as TodoDetail;
        setTodo(data);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачу");
      } finally {
        setLoading(false);
      }
    }

    loadTodo();
  }, [todoId]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-50">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading || !todo ? (
          <p className="text-sm text-slate-400">Загрузка задачи...</p>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold">{todo.title}</h1>
            {todo.description && (
              <p className="mb-4 text-sm text-slate-200">{todo.description}</p>
            )}

            <dl className="mb-6 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">Статус</dt>
                <dd className="font-medium">{todo.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Приоритет</dt>
                <dd className="font-medium">{todo.priority}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Срок</dt>
                <dd className="font-medium">
                  {todo.due_date ? formatDateTime(todo.due_date) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Повторение</dt>
                <dd className="font-medium">{todo.recurrence || "never"}</dd>
              </div>
            </dl>

            <SubtaskList todoId={todo.id} />
          </>
        )}
      </div>
    </main>
  );
}
