import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useAppShell } from "@/contexts/AppShellContext";
import { FilterBar } from "@/components/FilterBar";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { StatsCards } from "@/components/StatsCards";
import { TodoFormModal } from "@/components/TodoFormModal";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { hasActiveFilters, type QuickPreset } from "@/lib/todoFilters";

interface TagOption {
  id: number;
  tag_name: string;
}

interface TodoStats {
  total: number;
  done: number;
  in_progress: number;
  overdue: number;
}

const emptyStats: TodoStats = {
  total: 0,
  done: 0,
  in_progress: 0,
  overdue: 0,
};

function buildTodosQuery(params: {
  status?: string;
  priority?: string;
  tag?: string;
  search?: string;
  preset: QuickPreset;
}): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.tag) query.set("tag", params.tag);
  if (params.search) query.set("search", params.search);
  if (params.preset === "today") query.set("due_today", "true");
  if (params.preset === "overdue") query.set("overdue", "true");
  const qs = query.toString();
  return qs ? `/todos/?${qs}` : "/todos/";
}

export function HomePage() {
  const { registerFiltersToggle } = useAppShell();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<TodoStats>(emptyStats);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? "",
  );

  const hasToken = !!getAccessToken();
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const preset = (searchParams.get("preset") ?? "all") as QuickPreset;

  const refreshDashboard = useCallback(async () => {
    const todosPath = buildTodosQuery({
      status,
      priority,
      tag,
      search,
      preset,
    });
    const [statsRes, todosRes] = await Promise.all([
      apiFetch("/todos/stats/"),
      apiFetch(todosPath),
    ]);
    if (statsRes.ok) {
      setStats((await statsRes.json()) as TodoStats);
    }
    if (todosRes.ok) {
      setTodos((await todosRes.json()) as TodoRow[]);
    } else {
      throw new Error("Failed to load todos");
    }
  }, [status, priority, tag, search, preset]);

  useEffect(() => {
    if (!hasToken) {
      registerFiltersToggle(null);
      return;
    }
    registerFiltersToggle(() => setSidebarOpen(true));
    return () => registerFiltersToggle(null);
  }, [hasToken, registerFiltersToggle]);

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

    async function load() {
      try {
        setLoading(true);
        setError("");
        await refreshDashboard();
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачи");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [hasToken, refreshDashboard]);

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

  const filtersActive = hasActiveFilters({
    status,
    priority,
    tag,
    search,
    preset,
  });

  async function handleTodoCreated(todo: unknown) {
    const row = todo as TodoRow;
    setTodos((prev) => [row, ...prev]);
    try {
      await refreshDashboard();
    } catch {
      /* list already optimistically updated */
    }
  }

  async function handleTodoUpdated(updated: TodoRow) {
    setTodos((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    try {
      await refreshDashboard();
    } catch {
      /* ignore */
    }
  }

  async function handleTodoDeleted(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await refreshDashboard();
    } catch {
      /* ignore */
    }
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

      <div className="sticky top-0 z-20 -mx-4 mb-6 space-y-4 border-b border-slate-800/80 bg-slate-900/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <StatsCards
          total={stats.total}
          done={stats.done}
          inProgress={stats.in_progress}
          overdue={stats.overdue}
        />
      </div>

      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
        >
          + Новая задача
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_240px)_minmax(0,_1fr)]">
        <div className="hidden lg:block">
          <DashboardSidebar tags={tags} onNewTask={() => setShowForm(true)} />
        </div>

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
              Показано {todos.length} из {stats.total} задач
            </p>
          )}

          <TodoList
            todos={todos}
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

      <MobileSidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <DashboardSidebar
          tags={tags}
          onNewTask={() => setShowForm(true)}
          onNavigate={() => setSidebarOpen(false)}
          className="border-0 bg-transparent p-0"
        />
      </MobileSidebarDrawer>

      <TodoFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={handleTodoCreated}
      />
    </div>
  );
}
