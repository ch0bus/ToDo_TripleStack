"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getAccessToken, clearTokens } from "@/lib/auth";

import Link from "next/link";

type Todo = {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
};

export default function Home() {
  const router = useRouter();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // проверяем токен
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    async function loadTodos() {
      try {
        setLoading(true);
        const res = await apiFetch("/todos/");

        if (res.status === 401) {
          clearTokens();
          setError("Нужно войти в систему.");
          return;
        }

        if (!res.ok) throw new Error("Failed to load todos");

        const data = (await res.json()) as Todo[];
        setTodos(data);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачи");
      } finally {
        setLoading(false);
      }
    }

    loadTodos();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      setError("");
      const res = await apiFetch("/todos/", {
        method: "POST",
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.status === 401) {
        clearTokens();
        setError("Сессия истекла. Войдите снова.");
        return;
      }

      if (!res.ok) throw new Error("Failed to create todo");

      const newTodo = (await res.json()) as Todo;
      setTodos((prev) => [...prev, newTodo]);
      setTitle("");
    } catch (e) {
      console.error(e);
      setError("Не удалось добавить задачу");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTodo(id: number, completed: boolean) {
    try {
      setError("");
      const res = await apiFetch(`/todos/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });

      if (res.status === 401) {
        clearTokens();
        setError("Сессия истекла. Войдите снова.");
        return;
      }

      if (!res.ok) throw new Error("Failed to update todo");

      const updated = (await res.json()) as Todo;

      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      console.error(e);
      setError("Не удалось обновить задачу");
    }
  }

  async function deleteTodo(id: number) {
    try {
      setError("");
      const res = await apiFetch(`/todos/${id}/`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        clearTokens();
        setError("Сессия истекла. Войдите снова.");
        return;
      }

      if (!res.ok) throw new Error("Failed to delete todo");

      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить задачу");
    }
  }

  function handleLogout() {
    clearTokens();
    setTodos([]);
    setError("");
    router.push("/login");
  }

  const hasToken = !!getAccessToken();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-xl px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">ToDo App</h1>      
          {hasToken && (
    <button
      onClick={handleLogout}
      className="text-sm text-slate-300 hover:text-slate-100 cursor-pointer hover:underline transition-colors"
    >
      Выйти
    </button>
  )}    
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {!hasToken ? (
          <p className="text-sm text-slate-300">
            Вы не вошли. Перейдите на{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              страницу входа
            </Link>
          </p>
        ) : loading ? (
          <p className="text-sm text-slate-400">Загрузка задач...</p>
        ) : (
          <>
            <form onSubmit={handleAdd} className="flex gap-2 mb-6">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Новая задача..."
                className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2
                           text-sm placeholder:text-slate-500 focus:outline-none
                           focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
                           hover:bg-blue-500 active:bg-blue-700 transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Добавляю..." : "Добавить"}
              </button>
            </form>

            <ul className="space-y-2">
              {todos.length === 0 && (
                <li className="text-sm text-slate-400"></li>
              )}

              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center justify-between rounded-md bg-slate-800 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={(e) => toggleTodo(todo.id, e.target.checked)}
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
          </>
        )}
      </div>
    </main>
  );
}
