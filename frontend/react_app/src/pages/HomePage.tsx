import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { CreateAddMenu } from "@/components/CreateAddMenu";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DayNoteEditor } from "@/components/DayNoteEditor";
import { EventList } from "@/components/EventList";
import { useAppShell } from "@/contexts/AppShellContext";
import { FilterBar } from "@/components/FilterBar";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { SortBar } from "@/components/SortBar";
import { StatsCards } from "@/components/StatsCards";
import { InboxSkeleton } from "@/components/skeletons/InboxSkeleton";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { WeekDayStrip } from "@/components/WeekDayStrip";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  addDays,
  formatInboxDayTitle,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from "@/lib/calendar";
import type { DayNote } from "@/lib/dayNotes";
import {
  groupEventsForRange,
  uniqueEventEntries,
  type CalendarEvent,
} from "@/lib/events";
import { locationFrom, newTodoPath } from "@/lib/nav";
import {
  groupInboxTodos,
  hasActiveFilters,
  inboxBusyDayKeys,
  inboxTodosForDay,
} from "@/lib/todoFilters";
import { parseTodoSort, sortTodos } from "@/lib/todoSort";
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
  lead,
  action,
  count,
  onUpdated,
  onDeleted,
}: {
  id: string;
  title: string;
  todos: TodoRow[];
  empty: string;
  lead?: ReactNode;
  action?: ReactNode;
  count?: number;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
}) {
  return (
    <section id={id} className="min-w-0 space-y-3 scroll-mt-24">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
          {title}
          <span className="ml-2 font-normal text-app-subtle">
            {count ?? todos.length}
          </span>
        </h2>
        {action}
      </div>
      {lead}
      {todos.length > 0 ? (
        <TodoList
          todos={todos}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ) : empty ? (
        <p className="text-sm text-app-subtle">{empty}</p>
      ) : null}
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
  const [dayNote, setDayNote] = useState<DayNote | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const selectedDate = useMemo(() => {
    return parseDateKey(searchParams.get("day") ?? "") ?? today;
  }, [searchParams, today]);
  const selectedKey = toDateKey(selectedDate);
  const selectedIsToday = selectedKey === todayKey;
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
    setDayNote(null);
    let cancelled = false;
    async function loadDayNote() {
      const res = await apiFetch(`/day-notes/?from=${selectedKey}&to=${selectedKey}`);
      if (!res.ok || cancelled) return;
      const notes = (await res.json()) as DayNote[];
      if (!cancelled) setDayNote(notes[0] ?? null);
    }
    void loadDayNote();
    return () => {
      cancelled = true;
    };
  }, [hasToken, selectedKey, location.pathname]);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    async function loadEvents() {
      const res = await apiFetch("/events/");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as CalendarEvent[];
      if (!cancelled) setEvents(data);
    }
    void loadEvents();
    return () => {
      cancelled = true;
    };
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
  const dayTodos = useMemo(
    () => inboxTodosForDay(todos, selectedDate),
    [todos, selectedDate],
  );
  const restSort = parseTodoSort(searchParams.get("sort"), "new");
  const restTodos = useMemo(
    () => sortTodos(grouped.rest, restSort),
    [grouped.rest, restSort],
  );
  const dayEvents = useMemo(() => {
    const byDay = groupEventsForRange(events, selectedKey, selectedKey);
    return uniqueEventEntries(byDay.get(selectedKey) ?? []);
  }, [events, selectedKey]);
  const weekStart = startOfWeek(selectedDate);
  const weekFrom = toDateKey(weekStart);
  const weekTo = toDateKey(addDays(weekStart, 6));
  const busyDays = useMemo(() => {
    const keys = inboxBusyDayKeys(todos, weekFrom, weekTo);
    const byDay = groupEventsForRange(events, weekFrom, weekTo);
    for (const [key, list] of byDay) {
      if (list.length > 0) keys.add(key);
    }
    return keys;
  }, [todos, events, weekFrom, weekTo]);

  function selectDay(date: Date) {
    const key = toDateKey(date);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === todayKey) next.delete("day");
        else next.set("day", key);
        return next;
      },
      { replace: true },
    );
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

  function handleEventDeleted(id: number) {
    setEvents((prev) => prev.filter((item) => item.id !== id));
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
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 md:py-8">
      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_240px)_minmax(0,_1fr)]">
        <div className="hidden lg:block">
          <DashboardSidebar
            tags={tags}
          />
        </div>

        <div className="min-w-0 space-y-4">
          {loading ? (
            <div className="grid grid-cols-4 gap-1 sm:gap-3" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2 px-1">
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

          <div className="flex min-w-0 w-full items-center gap-2">
            <FilterBar />
            <CreateAddMenu
              className="min-w-0 flex-1"
              day={selectedKey}
              hasNote={Boolean(dayNote)}
              attachDayToTodo={false}
            />
          </div>

          <p className="text-sm text-app-muted">
            Показано {todos.length} из {stats.total} задач
          </p>

          <WeekDayStrip
            selected={selectedDate}
            today={today}
            busyDays={busyDays}
            onSelect={selectDay}
          />

          <div className="space-y-8">
              <InboxSection
                id="inbox-today"
                title={formatInboxDayTitle(selectedDate, today)}
                todos={dayTodos}
                count={dayTodos.length + dayEvents.length}
                empty={
                  dayEvents.length > 0
                    ? ""
                    : selectedIsToday
                      ? "На сегодня ничего не запланировано"
                      : "На этот день ничего не запланировано"
                }
                lead={
                  <>
                    <DayNoteEditor
                      key={selectedKey}
                      dateKey={selectedKey}
                      note={dayNote ?? undefined}
                      onChanged={setDayNote}
                    />
                    <EventList
                      entries={dayEvents}
                      onDeleted={handleEventDeleted}
                    />
                  </>
                }
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
              {todos.length === 0 && !filtersActive ? (
                <Link
                  to={newTodoPath()}
                  state={{ from: locationFrom(location) }}
                  className={btnPrimary + " inline-flex"}
                >
                  Создать задачу
                </Link>
              ) : todos.length === 0 ? (
                <p className="text-sm text-app-subtle">
                  По выбранным фильтрам задач нет
                </p>
              ) : (
                <>
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
                todos={restTodos}
                empty="Других активных задач нет"
                action={<SortBar defaultSort="new" />}
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
                </>
              )}
            </div>
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
          onNavigate={() => setSidebarOpen(false)}
          className="border-0 bg-transparent p-0"
        />
      </MobileSidebarDrawer>
    </div>
  );
}
