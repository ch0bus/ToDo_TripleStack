import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { CreateAddMenu } from "@/components/CreateAddMenu";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DayNoteEditor } from "@/components/DayNoteEditor";
import { EventFilterBar } from "@/components/EventFilterBar";
import { EventList } from "@/components/EventList";
import { useAppShell } from "@/contexts/AppShellContext";
import { FilterBar, StatusFilter } from "@/components/FilterBar";
import { ChoiceChip } from "@/components/FormFields";
import { ListReveal } from "@/components/ListReveal";
import { LoadingBar } from "@/components/LoadingBar";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { SearchField } from "@/components/SearchField";
import { SortBar } from "@/components/SortBar";
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
import { dayNotesMap, type DayNote } from "@/lib/dayNotes";
import {
  EVENT_SORT_OPTIONS,
  eventColorsInList,
  filterEventsByAttendance,
  filterEventsByColor,
  groupEventsForRange,
  inboxEventEntries,
  lastMissedEventEntries,
  parseEventAttn,
  parseEventSort,
  sortDayEventEntries,
  sortEventEntries,
  uniqueEventEntries,
  uniqueEventsInRange,
  type CalendarEvent,
} from "@/lib/events";
import { locationFrom, newTodoPath } from "@/lib/nav";
import type { TileWhenMode } from "@/lib/tileWhen";
import {
  groupInboxTodos,
  hasActiveFilters,
  inboxBusyDayKeys,
  parseInboxScope,
  todoInDateRange,
} from "@/lib/todoFilters";
import { parseTodoSort, sortInboxDayTodos, sortTodos } from "@/lib/todoSort";
import type { TagOption } from "@/lib/tags";
import { btnPrimary } from "@/lib/uiClasses";

function buildTodosQuery(params: {
  priority?: string;
  tag?: string;
}): string {
  const query = new URLSearchParams();
  if (params.priority) query.set("priority", params.priority);
  if (params.tag) query.set("tag", params.tag);
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
  reveal = false,
  onUpdated,
  onDeleted,
  whenMode = "list",
}: {
  id: string;
  title: string;
  todos: TodoRow[];
  empty: string;
  lead?: ReactNode;
  action?: ReactNode;
  count?: number;
  reveal?: boolean;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
  whenMode?: TileWhenMode;
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
        reveal ? (
          <ListReveal items={todos}>
            {(visible) => (
              <TodoList
                todos={visible}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
                whenMode={whenMode}
              />
            )}
          </ListReveal>
        ) : (
          <TodoList
            todos={todos}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            whenMode={whenMode}
          />
        )
      ) : empty ? (
        <p className="text-sm text-app-subtle">{empty}</p>
      ) : null}
    </section>
  );
}

function InboxScopeSwitch({
  scope,
  onChange,
}: {
  scope: "week" | "all";
  onChange: (scope: "week" | "all") => void;
}) {
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label="Объём списков">
      <ChoiceChip selected={scope === "week"} onClick={() => onChange("week")}>
        Неделя
      </ChoiceChip>
      <ChoiceChip selected={scope === "all"} onClick={() => onChange("all")}>
        Все
      </ChoiceChip>
    </div>
  );
}

export function HomePage() {
  const { registerFiltersToggle } = useAppShell();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);
  const [error, setError] = useState("");
  const [weekNotes, setWeekNotes] = useState<DayNote[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const selectedDate = useMemo(() => {
    return parseDateKey(searchParams.get("day") ?? "") ?? today;
  }, [searchParams, today]);
  const selectedKey = toDateKey(selectedDate);
  const selectedIsToday = selectedKey === todayKey;
  const weekStart = startOfWeek(selectedDate);
  const weekFrom = toDateKey(weekStart);
  const weekTo = toDateKey(addDays(weekStart, 6));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const hasToken = !!getAccessToken();
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const inboxScope = parseInboxScope(searchParams.get("scope"));

  const fetchDashboard = useCallback(async () => {
    const todosPath = buildTodosQuery({
      priority,
      tag,
    });
    const eventsPath = tag ? `/events/?tag=${encodeURIComponent(tag)}` : "/events/";
    const [todosRes, eventsRes] = await Promise.all([
      apiFetch(todosPath),
      apiFetch(eventsPath),
    ]);
    if (!todosRes.ok) throw new Error("Failed to load todos");
    return {
      todos: (await todosRes.json()) as TodoRow[],
      events: eventsRes.ok
        ? ((await eventsRes.json()) as CalendarEvent[])
        : null,
    };
  }, [priority, tag]);

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
    let cancelled = false;
    async function loadWeekNotes() {
      const notesQuery = new URLSearchParams({ from: weekFrom, to: weekTo });
      if (tag) notesQuery.set("tag", tag);
      const res = await apiFetch(`/day-notes/?${notesQuery.toString()}`);
      if (!res.ok || cancelled) return;
      const notes = (await res.json()) as DayNote[];
      if (!cancelled) setWeekNotes(notes);
    }
    void loadWeekNotes();
    return () => {
      cancelled = true;
    };
  }, [hasToken, weekFrom, weekTo, tag, location.pathname]);

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let barTimer = 0;
    async function load() {
      try {
        setError("");
        if (loadedOnce.current) {
          barTimer = window.setTimeout(() => {
            if (!cancelled) setRefreshing(true);
          }, 150);
        } else {
          setLoading(true);
        }
        const data = await fetchDashboard();
        if (cancelled) return;
        setTodos(data.todos);
        if (data.events) setEvents(data.events);
        loadedOnce.current = true;
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить задачи");
      } finally {
        window.clearTimeout(barTimer);
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(barTimer);
    };
  }, [hasToken, fetchDashboard, location.pathname]);

  const filtersActive = hasActiveFilters({
    priority,
    tag,
  });

  const grouped = useMemo(
    () => groupInboxTodos(todos, selectedDate),
    [todos, selectedDate],
  );
  const dayTodos = useMemo(
    () => sortInboxDayTodos(grouped.today),
    [grouped.today],
  );
  const restSort = parseTodoSort(searchParams.get("sort"), "new");
  const restPool = useMemo(() => {
    if (inboxScope === "all") return grouped.rest;
    return grouped.rest.filter((todo) =>
      todoInDateRange(todo, weekFrom, weekTo),
    );
  }, [grouped.rest, inboxScope, weekFrom, weekTo]);
  const restTodos = useMemo(() => {
    const rows = status
      ? restPool.filter((todo) => todo.status === status)
      : restPool;
    return sortTodos(rows, restSort);
  }, [restPool, restSort, status]);
  const weekTodoCount = useMemo(
    () => todos.filter((todo) => todoInDateRange(todo, weekFrom, weekTo)).length,
    [todos, weekFrom, weekTo],
  );
  const dayEvents = useMemo(() => {
    const byDay = groupEventsForRange(events, selectedKey, selectedKey);
    return sortDayEventEntries(
      uniqueEventEntries(byDay.get(selectedKey) ?? []),
    );
  }, [events, selectedKey]);
  const missedEvents = useMemo(() => lastMissedEventEntries(events), [events]);
  const hasTaskBlocks = todos.length > 0 || missedEvents.length > 0;
  const eventSort = parseEventSort(searchParams.get("esort"), "start");
  const eventColor = searchParams.get("ecolor");
  const eventAttn = parseEventAttn(searchParams.get("eattn"));
  const inboxEventsPool = useMemo(() => {
    const skipIds = new Set(
      [...dayEvents, ...missedEvents].map((entry) => entry.event.id),
    );
    const source =
      inboxScope === "all"
        ? inboxEventEntries(events, todayKey)
        : uniqueEventsInRange(
            groupEventsForRange(events, weekFrom, weekTo),
            weekFrom,
            weekTo,
          );
    return source.filter((entry) => !skipIds.has(entry.event.id));
  }, [
    events,
    todayKey,
    weekFrom,
    weekTo,
    inboxScope,
    dayEvents,
    missedEvents,
  ]);
  const inboxEventColors = useMemo(
    () => eventColorsInList(inboxEventsPool),
    [inboxEventsPool],
  );
  const inboxEvents = useMemo(() => {
    return sortEventEntries(
      filterEventsByAttendance(
        filterEventsByColor(inboxEventsPool, eventColor),
        eventAttn,
      ),
      eventSort,
    );
  }, [inboxEventsPool, eventColor, eventAttn, eventSort]);
  const notesByDay = useMemo(() => dayNotesMap(weekNotes), [weekNotes]);
  const dayNote = notesByDay.get(selectedKey) ?? null;
  const noteDays = useMemo(() => {
    const keys = new Set<string>();
    for (const note of weekNotes) {
      if (note.text.trim()) keys.add(note.date);
    }
    return keys;
  }, [weekNotes]);
  const busyDays = useMemo(() => {
    const keys = inboxBusyDayKeys(todos, weekFrom, weekTo);
    const byDay = groupEventsForRange(events, weekFrom, weekTo);
    for (const [key, list] of byDay) {
      if (list.length > 0) keys.add(key);
    }
    return keys;
  }, [todos, events, weekFrom, weekTo]);

  function setInboxScope(next: "week" | "all") {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "week") params.delete("scope");
        else params.set("scope", "all");
        return params;
      },
      { replace: true },
    );
  }

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
      const data = await fetchDashboard();
      setTodos(data.todos);
      if (data.events) setEvents(data.events);
    } catch {
      /* ignore */
    }
  }

  async function handleTodoDeleted(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      const data = await fetchDashboard();
      setTodos(data.todos);
      if (data.events) setEvents(data.events);
    } catch {
      /* ignore */
    }
  }

  function handleEventUpdated(updated: CalendarEvent) {
    setEvents((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleEventDeleted(id: number) {
    setEvents((prev) => prev.filter((item) => item.id !== id));
  }

  function handleNoteChanged(note: DayNote | null) {
    setWeekNotes((prev) => {
      const next = prev.filter((item) => item.date !== selectedKey);
      if (note) next.push(note);
      return next;
    });
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
            <InboxSkeleton />
          ) : (
            <>
          <div className="relative">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={(query) => {
              navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full">
            <LoadingBar active={refreshing} />
          </div>
          </div>

          <div className="flex min-w-0 w-full items-center gap-2">
            <FilterBar />
            <CreateAddMenu
              className="min-w-0 flex-1"
              day={selectedKey}
              hasNote={Boolean(dayNote)}
              attachDayToTodo={false}
            />
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-app-muted">
              {inboxScope === "week"
                ? `За неделю ${weekTodoCount} · всего ${todos.length}`
                : `Задач ${todos.length}`}
            </p>
            <InboxScopeSwitch scope={inboxScope} onChange={setInboxScope} />
          </div>

          <WeekDayStrip
            selected={selectedDate}
            today={today}
            busyDays={busyDays}
            noteDays={noteDays}
            onSelect={selectDay}
          />

          <div
            className={
              "space-y-8 transition-opacity " +
              (refreshing ? "pointer-events-none opacity-50" : "")
            }
            aria-busy={refreshing}
          >
              <InboxSection
                id="inbox-today"
                title={formatInboxDayTitle(selectedDate, today)}
                todos={dayTodos}
                count={dayTodos.length + dayEvents.length}
                whenMode="day"
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
                      onChanged={handleNoteChanged}
                    />
                    <EventList
                      entries={dayEvents}
                      onUpdated={handleEventUpdated}
                      onDeleted={handleEventDeleted}
                    />
                  </>
                }
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
              <section id="inbox-events" className="min-w-0 space-y-3 scroll-mt-24">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
                    События
                    <span className="ml-2 font-normal text-app-subtle">
                      {inboxEvents.length}
                    </span>
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <EventFilterBar colors={inboxEventColors} attendance />
                    <SortBar
                      paramName="esort"
                      defaultSort="start"
                      options={EVENT_SORT_OPTIONS}
                      label="Сортировка событий"
                    />
                  </div>
                </div>
                {inboxEvents.length > 0 ? (
                  <ListReveal items={inboxEvents}>
                    {(visible) => (
                      <EventList
                        entries={visible}
                        showDate
                        onUpdated={handleEventUpdated}
                        onDeleted={handleEventDeleted}
                      />
                    )}
                  </ListReveal>
                ) : (
                  <p className="text-sm text-app-subtle">
                    {inboxEventsPool.length > 0 && (eventColor || eventAttn)
                      ? eventAttn === "attended"
                        ? "Нет отмеченных событий."
                        : eventAttn === "open"
                          ? "Нет неотмеченных событий."
                          : "Нет событий выбранного цвета."
                      : events.length > 0
                        ? inboxScope === "week"
                          ? "На этой неделе других событий нет"
                          : "Других событий нет"
                        : "Событий нет"}
                  </p>
                )}
              </section>
              {!hasTaskBlocks && !filtersActive && events.length === 0 ? (
                <Link
                  to={newTodoPath()}
                  state={{ from: locationFrom(location) }}
                  className={btnPrimary + " inline-flex"}
                >
                  Создать задачу
                </Link>
              ) : !hasTaskBlocks && filtersActive ? (
                <p className="text-sm text-app-subtle">
                  По выбранным фильтрам задач нет
                </p>
              ) : hasTaskBlocks ? (
                <>
              <InboxSection
                id="inbox-all"
                title="Все задачи"
                todos={restTodos}
                empty={
                  status
                    ? "Нет задач с этим статусом"
                    : inboxScope === "week"
                      ? "На этой неделе других задач нет"
                      : "Других задач нет"
                }
                reveal
                action={
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusFilter />
                    <SortBar defaultSort="new" />
                  </div>
                }
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
              <InboxSection
                id="inbox-overdue"
                title="Просрочено"
                todos={grouped.overdue}
                count={grouped.overdue.length + missedEvents.length}
                empty={
                  missedEvents.length > 0 ? "" : "Просроченных задач нет"
                }
                lead={
                  <EventList
                    entries={missedEvents}
                    showDate
                    onUpdated={handleEventUpdated}
                    onDeleted={handleEventDeleted}
                  />
                }
                onUpdated={handleTodoUpdated}
                onDeleted={handleTodoDeleted}
              />
                </>
              ) : null}
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
