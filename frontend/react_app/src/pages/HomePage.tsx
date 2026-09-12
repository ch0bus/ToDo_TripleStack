import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useAppShell } from "@/contexts/AppShellContext";
import { FilterBar } from "@/components/FilterBar";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { StatsCards } from "@/components/StatsCards";
import { TodoFormModal } from "@/components/TodoFormModal";
import { InboxSkeleton } from "@/components/skeletons/InboxSkeleton";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { groupInboxTodos, hasActiveFilters } from "@/lib/todoFilters";
import type { TagOption } from "@/lib/tags";
import { btnPrimary, inputClass } from "@/lib/uiClasses";

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
}): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.tag) query.set("tag", params.tag);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return qs ? `/todos/?${qs}` : "/todos/";
}

function InboxSection({
  id,
  title,
  todos,
  empty,
  onUpdated,
  onDeleted,
}: {
  id: string;
  title: string;
  todos: TodoRow[];
  empty: string;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
        {title}
        <span className="ml-2 font-normal text-app-subtle">{todos.length}</span>
      </h2>
      {todos.length > 0 ? (
        <TodoList
          todos={todos}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ) : (
        <p className="text-sm text-app-subtle">{empty}</p>
      )}
    </section>
  );
}

export function HomePage() {
  const { registerFiltersToggle } = useAppShell();
  const location = useLocation();
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

  const refreshDashboard = useCallback(async () => {
    const todosPath = buildTodosQuery({
      status,
      priority,
      tag,
      search,
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
  }, [status, priority, tag, search]);

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
  }, [hasToken, location.pathname]);

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
  }, [hasToken, refreshDashboard, location.pathname]);

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
  });

  const grouped = useMemo(() => groupInboxTodos(todos), [todos]);

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
        <h1 className="mb-3 text-2xl font-semibold">Входящие</h1>
        <p className="mb-6 text-sm text-app-muted">
          Войдите, чтобы видеть и создавать задачи.
        </p>
        <Link
          to="/login"
          className={btnPrimary + " inline-block"}
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

      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-app bg-app-header px-4 py-3 backdrop-blur md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2 px-1" aria-hidden>
                <div className="h-3 w-16 rounded bg-app-border" />
                <div className="h-7 w-10 rounded bg-app-border" />
              </div>
            ))}
          </div>
        ) : (
          <StatsCards
            total={stats.total}
            done={stats.done}
            inProgress={stats.in_progress}
            overdue={stats.overdue}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_240px)_minmax(0,_1fr)]">
        <div className="hidden lg:block">
          <DashboardSidebar
            tags={tags}
            onNewTask={() => setShowForm(true)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <InboxSkeleton />
          ) : (
            <>
          <input
            type="text"
            placeholder="Поиск задач..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={inputClass}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterBar />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={btnPrimary + " shrink-0"}
            >
              + Новая задача
            </button>
          </div>

          <p className="text-sm text-app-muted">
            Показано {todos.length} из {stats.total} задач
          </p>

          {todos.length === 0 ? (
            <TodoList
              todos={todos}
              emptyMessage={
                filtersActive
                  ? "По выбранным фильтрам задач нет"
                  : "Задач пока нет — создайте первую"
              }
              emptyAction={
                !filtersActive ? (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className={btnPrimary}
                  >
                    Создать задачу
                  </button>
                ) : undefined
              }
              onUpdated={handleTodoUpdated}
              onDeleted={handleTodoDeleted}
            />
          ) : (
            <div className="space-y-8">
              <InboxSection
                id="inbox-today"
                title="Сегодня"
                todos={grouped.today}
                empty="На сегодня ничего не запланировано"
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
              <InboxSection
                id="inbox-overdue"
                title="Просрочено"
                todos={grouped.overdue}
                empty="Просроченных задач нет"
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
              <InboxSection
                id="inbox-all"
                title="Все задачи"
                todos={grouped.rest}
                empty="Других активных задач нет"
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
              <InboxSection
                id="inbox-done"
                title="Готово"
                todos={grouped.done}
                empty="Пока нет выполненных задач"
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
            </div>
          )}
            </>
          )}
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
        tags={tags}
        onClose={() => setShowForm(false)}
        onCreated={handleTodoCreated}
      />
    </div>
  );
}
