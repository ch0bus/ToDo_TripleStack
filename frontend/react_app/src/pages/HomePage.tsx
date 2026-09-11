import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { FilterBar } from "@/components/FilterBar";
import { StatsCards } from "@/components/StatsCards";
import { TodoFormModal } from "@/components/TodoFormModal";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  applyQuickPreset,
  computeTodoStats,
  hasActiveFilters,
  type QuickPreset,
} from "@/lib/todoFilters";

interface TagOption {
  id: number;
  tag_name: string;
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allTodos, setAllTodos] = useState<TodoRow[]>([]);
  const [apiTodos, setApiTodos] = useState<TodoRow[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? "",
  );

  const hasToken = !!getAccessToken();
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const preset = (searchParams.get("preset") ?? "all") as QuickPreset;

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }

    async function loadTags() {
      const res = await apiFetch("/tags/");
      if (res.ok) setTags((await res.json()) as TagOption[]);
    }
    loadTags();
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken) return;

    async function loadFiltered() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        if (status) query.set("status", status);
        if (priority) query.set("priority", priority);
        if (tag) query.set("tag", tag);
        if (search) query.set("search", search);

        const qs = query.toString();
        const [allRes, filteredRes] = await Promise.all([
          apiFetch("/todos/"),
          apiFetch(qs ? `/todos/?${qs}` : "/todos/"),
        ]);

        if (!filteredRes.ok) throw new Error("Failed to load todos");
        if (allRes.ok) {
          setAllTodos((await allRes.json()) as TodoRow[]);
        }
        setApiTodos((await filteredRes.json()) as TodoRow[]);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачи");
      } finally {
        setLoading(false);
      }
    }

    loadFiltered();
  }, [hasToken, status, priority, tag, search]);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const trimmed = searchInput.trim();
        const current = next.get("search") ?? "";
        if (trimmed === current) return prev;
        if (trimmed) next.set("search", trimmed);
        else next.delete("search");
        return next;
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, setSearchParams]);

  const displayedTodos = useMemo(
    () => applyQuickPreset(apiTodos, preset),
    [apiTodos, preset],
  );

  const stats = useMemo(() => computeTodoStats(allTodos), [allTodos]);

  const filtersActive = hasActiveFilters({
    status,
    priority,
    tag,
    search,
    preset,
  });

  function handleTodoCreated(todo: unknown) {
    const row = todo as TodoRow;
    setAllTodos((prev) => [row, ...prev]);
    setApiTodos((prev) => [row, ...prev]);
  }

  function handleTodoUpdated(updated: TodoRow) {
    const map = (list: TodoRow[]) =>
      list.map((t) => (t.id === updated.id ? updated : t));
    setAllTodos(map);
    setApiTodos(map);
  }

  function handleTodoDeleted(id: number) {
    const filter = (list: TodoRow[]) => list.filter((t) => t.id !== id);
    setAllTodos(filter);
    setApiTodos(filter);
  }

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
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-4">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <StatsCards
          total={stats.total}
          done={stats.done}
          inProgress={stats.inProgress}
          overdue={stats.overdue}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_240px)_minmax(0,_1fr)]">
        <DashboardSidebar tags={tags} onNewTask={() => setShowForm(true)} />

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Поиск задач..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <FilterBar />

          {!loading && (
            <p className="text-sm text-slate-400">
              Показано {displayedTodos.length} из {allTodos.length} задач
            </p>
          )}

          <TodoList
            todos={displayedTodos}
            loading={loading}
            emptyMessage={
              filtersActive
                ? "😴 Никаких задач не найдено"
                : "🎉 Отлично! У вас нет задач"
            }
            onUpdated={handleTodoUpdated}
            onDeleted={handleTodoDeleted}
          />
        </div>
      </div>

      <TodoFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={handleTodoCreated}
      />
    </div>
  );
}
