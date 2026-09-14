import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

import { CalendarOccurrenceRow } from "@/components/CalendarOccurrenceRow";
import { CalendarYearGrid } from "@/components/CalendarYearGrid";
import { DayNoteEditor } from "@/components/DayNoteEditor";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { EventBookmark } from "@/components/EventBookmark";
import { EventItem } from "@/components/EventItem";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { MonthShiftFill } from "@/components/MonthShiftFill";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { ShiftCalendarPicker } from "@/components/ShiftCalendarPicker";
import { ShiftSchedulePanel } from "@/components/ShiftSchedulePanel";
import { TodoItem } from "@/components/TodoItem";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { useAppShell } from "@/contexts/AppShellContext";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  WEEKDAY_LABELS,
  addMonths,
  addYears,
  buildMonthGrid,
  formatDayTitle,
  formatMonthName,
  formatMonthTitle,
  groupTodosForMonth,
  parseDateKey,
  parseMonthKey,
  sortCalendarEntries,
  uniqueTodosInMonth,
  type CalendarEntry,
  startOfMonth,
  toDateKey,
  toMonthKey,
} from "@/lib/calendar";
import { dayNotesMap, type DayNote } from "@/lib/dayNotes";
import {
  eventFlagColors,
  groupEventsForRange,
  uniqueEventEntries,
  type CalendarEvent,
} from "@/lib/events";
import {
  emptyPattern,
  formatShiftPayLine,
  formatShiftTotalsLine,
  markColors,
  nextShiftCalendarName,
  shiftMarksByDate,
  summarizeShiftDays,
  type PaintTool,
  type ShiftCalendar,
  type ShiftDay,
  type ShiftKind,
  type ShiftKindWrite,
  type ShiftLayer,
  type ShiftPattern,
} from "@/lib/shifts";
import { locationFrom, newEventPath, newTodoPath } from "@/lib/nav";
import type { TagOption } from "@/lib/tags";
import { isOverdue, pluralRu } from "@/lib/utils";

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-8 w-48 rounded bg-app-border" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-app-border/60 sm:h-20" />
        ))}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { registerFiltersToggle } = useAppShell();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shiftCalendars, setShiftCalendars] = useState<ShiftCalendar[]>([]);
  const [shiftLayers, setShiftLayers] = useState<ShiftLayer[]>([]);
  const [shiftKinds, setShiftKinds] = useState<ShiftKind[]>([]);
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([]);
  const [shiftDays, setShiftDays] = useState<ShiftDay[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [paint, setPaint] = useState<PaintTool>({ type: "select" });
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const [showShifts, setShowShifts] = useState(false);

  const hasToken = !!getAccessToken();
  const today = useMemo(() => new Date(), []);

  const month = useMemo(() => {
    return parseMonthKey(searchParams.get("month") ?? "") ?? startOfMonth(today);
  }, [searchParams, today]);

  const calendarView = searchParams.get("view") === "year" ? "year" : "month";
  const calendarIdFromUrl = Number(searchParams.get("calendar") ?? "");
  const selectedShiftCalendar =
    shiftCalendars.find((row) => row.id === calendarIdFromUrl) ??
    shiftCalendars[0];

  const selectedDay = useMemo(() => {
    const fromUrl = parseDateKey(searchParams.get("day") ?? "");
    if (fromUrl) return fromUrl;
    if (
      today.getFullYear() === month.getFullYear() &&
      (calendarView === "year" || today.getMonth() === month.getMonth())
    ) {
      return today;
    }
    return startOfMonth(month);
  }, [searchParams, month, today, calendarView]);

  const cells = useMemo(() => buildMonthGrid(month, today), [month, today]);
  const rangeFrom = cells[0]?.key;
  const rangeTo = cells[cells.length - 1]?.key;
  const yearFrom = `${month.getFullYear()}-01-01`;
  const yearTo = `${month.getFullYear()}-12-31`;
  const queryFrom = calendarView === "year" ? yearFrom : rangeFrom;
  const queryTo = calendarView === "year" ? yearTo : rangeTo;
  const byDay = useMemo(() => {
    if (!queryFrom || !queryTo) return new Map<string, CalendarEntry[]>();
    return groupTodosForMonth(todos, queryFrom, queryTo);
  }, [todos, queryFrom, queryTo]);
  const eventsByDay = useMemo(() => {
    if (!queryFrom || !queryTo) return new Map();
    return groupEventsForRange(events, queryFrom, queryTo);
  }, [events, queryFrom, queryTo]);
  const undated = useMemo(
    () => todos.filter((todo) => !todo.due_date && !todo.event_date),
    [todos],
  );
  const monthTodos = useMemo(
    () => uniqueTodosInMonth(cells, byDay),
    [cells, byDay],
  );
  const selectedKey = toDateKey(selectedDay);
  const selectedEntries = useMemo(
    () => sortCalendarEntries(byDay.get(selectedKey) ?? []),
    [byDay, selectedKey],
  );
  const selectedEventEntries = useMemo(
    () => uniqueEventEntries(eventsByDay.get(selectedKey) ?? []),
    [eventsByDay, selectedKey],
  );
  const selectedRealCount = selectedEntries.filter((entry) => !entry.virtual).length;
  const selectedRepeatCount = selectedEntries.length - selectedRealCount;
  const shiftsByDay = useMemo(
    () => shiftMarksByDate(shiftDays, shiftLayers),
    [shiftDays, shiftLayers],
  );
  const notesByDay = useMemo(() => dayNotesMap(dayNotes), [dayNotes]);
  const selectedMarks = shiftsByDay.get(selectedKey);
  const selectedNote = notesByDay.get(selectedKey);
  const activeLayer =
    shiftLayers.find((layer) => layer.id === activeLayerId) ?? shiftLayers[0];
  const activeKinds = useMemo(
    () =>
      shiftKinds.filter((kind) => (activeLayer ? kind.layer_id === activeLayer.id : false)),
    [shiftKinds, activeLayer],
  );
  const activePattern = useMemo(() => {
    if (!activeLayer) return emptyPattern(null);
    return (
      shiftPatterns.find((row) => row.layer_id === activeLayer.id) ??
      emptyPattern(activeLayer.id)
    );
  }, [shiftPatterns, activeLayer]);
  const monthFrom = `${toMonthKey(month)}-01`;
  const monthTo = toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthLayerTotals = useMemo(
    () =>
      shiftLayers.map((layer) => ({
        layer,
        totals: summarizeShiftDays(shiftDays, monthFrom, monthTo, layer.id),
      })),
    [shiftLayers, shiftDays, monthFrom, monthTo],
  );
  const yearLayerTotals = useMemo(
    () =>
      shiftLayers.map((layer) => ({
        layer,
        totals: summarizeShiftDays(shiftDays, yearFrom, yearTo, layer.id),
      })),
    [shiftLayers, shiftDays, yearFrom, yearTo],
  );

  const loadCalendars = useCallback(async () => {
    const res = await apiFetch("/shift-calendars/");
    if (res.ok) setShiftCalendars((await res.json()) as ShiftCalendar[]);
  }, []);

  const loadShifts = useCallback(async () => {
    if (!queryFrom || !queryTo || !selectedShiftCalendar) return;
    const calendarQ = `calendar=${selectedShiftCalendar.id}`;
    const [layersRes, kindsRes, patternRes, daysRes] = await Promise.all([
      apiFetch(`/shift-layers/?${calendarQ}`),
      apiFetch(`/shift-kinds/?${calendarQ}`),
      apiFetch(`/shift-pattern/?${calendarQ}`),
      apiFetch(`/shift-days/?from=${queryFrom}&to=${queryTo}&${calendarQ}`),
    ]);
    if (layersRes.ok) {
      const layers = (await layersRes.json()) as ShiftLayer[];
      setShiftLayers(layers);
      setActiveLayerId((current) => {
        if (current && layers.some((layer) => layer.id === current)) return current;
        return layers[0]?.id ?? null;
      });
    }
    if (kindsRes.ok) setShiftKinds((await kindsRes.json()) as ShiftKind[]);
    if (patternRes.ok) {
      const payload = await patternRes.json();
      setShiftPatterns(
        Array.isArray(payload) ? (payload as ShiftPattern[]) : [payload as ShiftPattern],
      );
    }
    if (daysRes.ok) setShiftDays((await daysRes.json()) as ShiftDay[]);
  }, [queryFrom, queryTo, selectedShiftCalendar]);

  const loadNotes = useCallback(async () => {
    if (!queryFrom || !queryTo) return;
    const res = await apiFetch(`/day-notes/?from=${queryFrom}&to=${queryTo}`);
    if (res.ok) setDayNotes((await res.json()) as DayNote[]);
  }, [queryFrom, queryTo]);

  const load = useCallback(async () => {
    const [todosRes, tagsRes, eventsRes] = await Promise.all([
      apiFetch("/todos/"),
      apiFetch("/tags/"),
      apiFetch("/events/"),
    ]);
    if (!todosRes.ok) throw new Error("Failed to load todos");
    setTodos((await todosRes.json()) as TodoRow[]);
    if (tagsRes.ok) setTags((await tagsRes.json()) as TagOption[]);
    if (eventsRes.ok) setEvents((await eventsRes.json()) as CalendarEvent[]);
  }, []);

  useEffect(() => {
    registerFiltersToggle(() => setSidebarOpen(true));
    return () => registerFiltersToggle(null);
  }, [registerFiltersToggle]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError("");
        await load();
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить календарь");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!shiftCalendars.length) return;
    if (shiftCalendars.some((row) => row.id === calendarIdFromUrl)) return;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("calendar", String(shiftCalendars[0].id));
        return params;
      },
      { replace: true },
    );
  }, [shiftCalendars, calendarIdFromUrl, setSearchParams]);

  function handleNoteChanged(note: DayNote | null) {
    setDayNotes((prev) => {
      const next = prev.filter((item) => item.date !== selectedKey);
      if (note) next.push(note);
      return next;
    });
  }

  function setMonth(next: Date) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(next));
      const day = parseDateKey(params.get("day") ?? "");
      if (day && day.getMonth() !== next.getMonth()) {
        params.set("day", toDateKey(startOfMonth(next)));
      }
      return params;
    });
  }

  function setCalendarView(next: "month" | "year") {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === "year") params.set("view", "year");
      else params.delete("view");
      return params;
    });
  }

  function handleToday() {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(today));
      params.set("day", toDateKey(today));
      params.delete("view");
      return params;
    });
  }

  function handleYearMonth(date: Date) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(date));
      params.set("day", toDateKey(date));
      params.delete("view");
      return params;
    });
  }

  function handleYearDay(date: Date) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(date));
      params.set("day", toDateKey(date));
      params.set("view", "year");
      return params;
    });
  }

  function selectDay(date: Date) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(date));
      params.set("day", toDateKey(date));
      return params;
    });
  }

  async function handleDayClick(date: Date) {
    selectDay(date);
    const key = toDateKey(date);
    if (paint.type === "select" || !activeLayer) return;
    try {
      if (paint.type === "pattern") {
        await apiFetch(`/shift-days/${key}/?layer=${activeLayer.id}`, {
          method: "DELETE",
        });
      } else {
        const res = await apiFetch("/shift-days/", {
          method: "PUT",
          body: JSON.stringify({
            date: key,
            layer_id: activeLayer.id,
            kind_id: paint.type === "off" ? null : paint.id,
          }),
        });
        if (!res.ok) throw new Error("shift paint failed");
      }
      await loadShifts();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateKind(payload: ShiftKindWrite) {
    const res = await apiFetch("/shift-kinds/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("create kind failed");
    await loadShifts();
  }

  async function handleUpdateKind(
    id: number,
    payload: Omit<ShiftKindWrite, "layer_id">,
  ) {
    const res = await apiFetch(`/shift-kinds/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("update kind failed");
    await loadShifts();
  }

  async function handleDeleteKind(id: number) {
    const res = await apiFetch(`/shift-kinds/${id}/`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete kind failed");
    if (paint.type === "kind" && paint.id === id) {
      setPaint({ type: "select" });
    }
    await loadShifts();
  }

  async function handleSavePattern(
    startDate: string,
    endDate: string | null,
    kindIds: Array<number | null>,
  ) {
    if (!activeLayer) throw new Error("no layer");
    const res = await apiFetch("/shift-pattern/", {
      method: "PUT",
      body: JSON.stringify({
        layer_id: activeLayer.id,
        start_date: startDate,
        end_date: endDate,
        slots: kindIds.map((kind_id) => ({ kind_id })),
      }),
    });
    if (!res.ok) throw new Error("save pattern failed");
    await loadShifts();
  }

  async function handleRenameLayer(id: number, name: string) {
    const res = await apiFetch(`/shift-layers/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("rename layer failed");
    await loadShifts();
  }

  function handleActiveLayerChange(id: number) {
    setActiveLayerId(id);
    setPaint({ type: "select" });
  }

  function handleShiftCalendarChange(id: number) {
    setPaint({ type: "select" });
    setActiveLayerId(null);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("calendar", String(id));
      return params;
    });
  }

  async function handleCreateShiftCalendar() {
    const name = nextShiftCalendarName(shiftCalendars);
    const res = await apiFetch("/shift-calendars/", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as ShiftCalendar;
    setShiftCalendars((prev) => [...prev, created]);
    setShowShifts(true);
    handleShiftCalendarChange(created.id);
  }

  async function handleRenameCalendar(name: string) {
    if (!selectedShiftCalendar) return;
    const res = await apiFetch(`/shift-calendars/${selectedShiftCalendar.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("rename calendar failed");
    await loadCalendars();
  }

  async function handleDeleteCalendar() {
    if (!selectedShiftCalendar || shiftCalendars.length <= 1) return;
    if (!window.confirm("Удалить этот календарь смен?")) return;
    const res = await apiFetch(`/shift-calendars/${selectedShiftCalendar.id}/`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const remaining = shiftCalendars.filter(
      (row) => row.id !== selectedShiftCalendar.id,
    );
    setShiftCalendars(remaining);
    if (remaining[0]) handleShiftCalendarChange(remaining[0].id);
  }

  async function handleTodoUpdated(updated: TodoRow) {
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await load();
    } catch {
      /* ignore */
    }
  }

  async function handleTodoDeleted(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await load();
    } catch {
      /* ignore */
    }
  }

  function handleEventDeleted(id: number) {
    setEvents((prev) => prev.filter((item) => item.id !== id));
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 md:py-8">
      {error && (
        <div className="chip-danger mb-4 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_240px)_minmax(0,_1fr)]">
        <div className="hidden lg:block">
          <DashboardSidebar
            tags={tags}
          />
        </div>

        <div className="min-w-0 space-y-6">
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <>
              <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <ShiftCalendarPicker
                  className="min-w-0 w-full md:w-auto md:flex-none"
                  calendars={shiftCalendars}
                  value={selectedShiftCalendar?.id ?? null}
                  onChange={handleShiftCalendarChange}
                  onCreate={() => void handleCreateShiftCalendar()}
                />
                <div className="grid w-full grid-cols-3 gap-2 md:w-auto">
                  <button
                    type="button"
                    aria-expanded={showShifts}
                    aria-controls="shift-schedule"
                    onClick={() => {
                      if (showShifts) {
                        setPaint({ type: "select" });
                        setShowShifts(false);
                      } else {
                        setShowShifts(true);
                      }
                    }}
                    className={
                      "h-10 rounded-md px-2 text-sm font-medium sm:px-3 " +
                      (showShifts
                        ? "border border-app-strong bg-app-surface-muted text-app"
                        : "border border-app text-app-muted hover:bg-app-surface-muted hover:text-app")
                    }
                  >
                    График смен
                  </button>
                  <Link
                    to={newEventPath(selectedKey)}
                    state={{ from: locationFrom(location) }}
                    className="flex h-10 items-center justify-center rounded-md border border-app px-2 text-sm font-medium text-app-muted hover:bg-app-surface-muted hover:text-app sm:px-3"
                  >
                    + Событие
                  </Link>
                  <Link
                    to={newTodoPath(selectedKey)}
                    state={{ from: locationFrom(location) }}
                    className="btn-primary flex h-10 items-center justify-center rounded-md px-2 text-sm font-medium shadow-sm sm:px-3"
                  >
                    + Новая задача
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div />
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMonth(
                        calendarView === "year"
                          ? addYears(month, -1)
                          : addMonths(month, -1),
                      )
                    }
                    className="shrink-0 rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
                    aria-label={
                      calendarView === "year"
                        ? "Предыдущий год"
                        : "Предыдущий месяц"
                    }
                  >
                    ←
                  </button>
                  <MonthYearPicker
                    value={month}
                    mode={calendarView}
                    onChange={setMonth}
                    onToday={handleToday}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMonth(
                        calendarView === "year"
                          ? addYears(month, 1)
                          : addMonths(month, 1),
                      )
                    }
                    className="shrink-0 rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
                    aria-label={
                      calendarView === "year"
                        ? "Следующий год"
                        : "Следующий месяц"
                    }
                  >
                    →
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarView(
                        calendarView === "year" ? "month" : "year",
                      )
                    }
                    className="text-sm text-app-accent hover:underline"
                  >
                    {calendarView === "year" ? "Месяц" : "Год"}
                  </button>
                </div>
              </div>
              </div>

              {showShifts && activeLayer && selectedShiftCalendar && (
                <ShiftSchedulePanel
                  key={`${selectedShiftCalendar.id}-${activeLayer.id}`}
                  calendar={selectedShiftCalendar}
                  canDeleteCalendar={shiftCalendars.length > 1}
                  layers={shiftLayers}
                  activeLayer={activeLayer}
                  kinds={activeKinds}
                  pattern={activePattern}
                  paint={paint}
                  onActiveLayerChange={handleActiveLayerChange}
                  onRenameLayer={handleRenameLayer}
                  onRenameCalendar={handleRenameCalendar}
                  onDeleteCalendar={handleDeleteCalendar}
                  onPaintChange={setPaint}
                  onCreateKind={handleCreateKind}
                  onUpdateKind={handleUpdateKind}
                  onDeleteKind={handleDeleteKind}
                  onSavePattern={handleSavePattern}
                />
              )}

              {calendarView === "year" ? (
                <>
                <CalendarYearGrid
                  year={month.getFullYear()}
                  today={today}
                  selectedKey={selectedKey}
                  byDay={byDay}
                  eventsByDay={eventsByDay}
                  marksByDay={shiftsByDay}
                  notesByDay={notesByDay}
                  onSelectMonth={handleYearMonth}
                  onSelectDay={handleYearDay}
                />
                <section className="space-y-1">
                  <h2 className="text-lg font-semibold capitalize text-app">
                    {formatDayTitle(selectedDay)}
                  </h2>
                  {shiftLayers.map((layer, index) => {
                    const mark = selectedMarks?.[index as 0 | 1];
                    return (
                      <p key={layer.id} className="text-sm text-app-muted">
                        <span className="text-app">{layer.name}: </span>
                        {mark?.kind ? (
                          <>
                            <span
                              className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                              style={{ backgroundColor: mark.kind.color }}
                              aria-hidden
                            />
                            {mark.kind.name} · {formatShiftPayLine(mark.kind)}
                          </>
                        ) : (
                          "нет смены"
                        )}
                      </p>
                    );
                  })}
                  {yearLayerTotals.map(({ layer, totals }) => (
                    <p key={layer.id} className="text-sm text-app-muted">
                      {formatShiftTotalsLine(
                        `За ${month.getFullYear()} · ${layer.name}`,
                        totals,
                      )}
                    </p>
                  ))}
                  {selectedEventEntries.length > 0 && (
                    <ul className="space-y-2 pt-2">
                      {selectedEventEntries.map((entry) => (
                        <EventItem
                          key={`${entry.event.id}-${entry.occurrenceStartKey}`}
                          entry={entry}
                          onDeleted={handleEventDeleted}
                        />
                      ))}
                    </ul>
                  )}
                </section>
                </>
              ) : (
              <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
                <div className="grid grid-cols-7 border-b border-app bg-app-surface-muted/50">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-app-subtle"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {cells.map((cell) => {
                    const dayEntries = byDay.get(cell.key) ?? [];
                    const realCount = dayEntries.filter((entry) => !entry.virtual).length;
                    const repeatCount = dayEntries.length - realCount;
                    const overdue = dayEntries.some(
                      (entry) =>
                        !entry.virtual &&
                        isOverdue(entry.todo.due_date, entry.todo.status),
                    );
                    const selected = cell.key === selectedKey;
                    const dayMarks = shiftsByDay.get(cell.key);
                    const note = notesByDay.get(cell.key);
                    const dayEvents = eventsByDay.get(cell.key) ?? [];
                    const flagColors = eventFlagColors(dayEvents);
                    const eventTitles = uniqueEventEntries(dayEvents).map(
                      (entry) => entry.event.title,
                    );
                    const colors = markColors(dayMarks);
                    const marks = Math.min(realCount, 3);
                    const shiftNames = shiftLayers
                      .map((layer, index) => {
                        const kind = dayMarks?.[index as 0 | 1]?.kind;
                        return kind ? `${layer.name}: ${kind.name}` : "";
                      })
                      .filter(Boolean);
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => void handleDayClick(cell.date)}
                        title={
                          [
                            ...shiftNames,
                            ...eventTitles,
                            note?.text,
                            repeatCount
                              ? `${repeatCount} ${pluralRu(repeatCount, "повтор", "повтора", "повторов")}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || undefined
                        }
                        className={
                          "relative min-h-16 overflow-hidden border-b border-r border-app px-1.5 py-1.5 text-left last:border-r-0 sm:min-h-20 " +
                          (selected
                            ? "bg-[var(--app-accent-soft)]"
                            : "hover:bg-app-surface-muted") +
                          (cell.inMonth ? "" : " opacity-40") +
                          (note ? " calendar-day-note" : "")
                        }
                      >
                        <MonthShiftFill colors={colors} />
                        {flagColors.map((color, index) => (
                          <EventBookmark key={color + index} color={color} index={index} />
                        ))}
                        <span
                          className={
                            "relative inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                            (cell.isToday
                              ? "bg-[var(--app-accent)] font-semibold text-white"
                              : selected
                                ? "font-semibold text-app-accent"
                                : "text-app-muted")
                          }
                        >
                          {cell.date.getDate()}
                        </span>
                        {(realCount > 0 || repeatCount > 0) && (
                          <span className="relative mt-1 flex flex-wrap items-center justify-center gap-0.5">
                            {Array.from({ length: marks }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  "h-1.5 w-1.5 rounded-full " +
                                  (overdue ? "bg-red-500" : "bg-[var(--app-accent)]")
                                }
                              />
                            ))}
                            {realCount > 3 && (
                              <span className="text-[10px] text-app-subtle">
                                +{realCount - 3}
                              </span>
                            )}
                            {repeatCount > 0 && (
                              <span
                                className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center text-app-subtle"
                                aria-label="Есть повторы задач"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-3 w-3"
                                  aria-hidden
                                >
                                  <path d="M17 1v4h-4" />
                                  <path d="M7 23v-4h4" />
                                  <path d="M20.5 9A8 8 0 0 0 7.2 5.2L7 5" />
                                  <path d="M3.5 15A8 8 0 0 0 16.8 18.8L17 19" />
                                </svg>
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {calendarView === "month" && (
              <section className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold capitalize text-app">
                    {formatDayTitle(selectedDay)}
                  </h2>
                  <p className="text-sm text-app-subtle">
                    {[
                      selectedEventEntries.length
                        ? `${selectedEventEntries.length} ${pluralRu(selectedEventEntries.length, "событие", "события", "событий")}`
                        : "",
                      selectedRealCount ? `${selectedRealCount} задач` : "",
                      selectedRepeatCount
                        ? `${selectedRepeatCount} ${pluralRu(selectedRepeatCount, "повтор", "повтора", "повторов")}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Нет событий и задач в этот день"}
                  </p>
                </div>
                {shiftLayers.map((layer, index) => {
                  const mark = selectedMarks?.[index as 0 | 1];
                  return (
                    <p key={layer.id} className="text-sm text-app-muted">
                      <span className="text-app">{layer.name}: </span>
                      {mark?.kind ? (
                        <>
                          <span
                            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                            style={{ backgroundColor: mark.kind.color }}
                            aria-hidden
                          />
                          {mark.kind.name} · {formatShiftPayLine(mark.kind)}
                        </>
                      ) : (
                        "нет смены"
                      )}
                    </p>
                  );
                })}
                {monthLayerTotals.map(({ layer, totals }) => (
                  <p key={layer.id} className="text-sm text-app-muted">
                    {formatShiftTotalsLine(
                      `За ${formatMonthName(month).toLowerCase()} · ${layer.name}`,
                      totals,
                    )}
                  </p>
                ))}
                <DayNoteEditor
                  dateKey={selectedKey}
                  note={selectedNote}
                  onChanged={handleNoteChanged}
                />
                {selectedEventEntries.length > 0 && (
                  <ul className="space-y-2">
                    {selectedEventEntries.map((entry) => (
                      <EventItem
                        key={`${entry.event.id}-${entry.occurrenceStartKey}`}
                        entry={entry}
                        onDeleted={handleEventDeleted}
                      />
                    ))}
                  </ul>
                )}
                {selectedEntries.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedEntries.map((entry) =>
                      entry.virtual ? (
                        <CalendarOccurrenceRow
                          key={`${entry.todo.id}-${entry.dateKey}`}
                          todo={entry.todo}
                        />
                      ) : (
                        <TodoItem
                          key={entry.todo.id}
                          todo={entry.todo}
                          onUpdated={handleTodoUpdated}
                          onDeleted={handleTodoDeleted}
                        />
                      ),
                    )}
                  </ul>
                ) : selectedEventEntries.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-app px-4 py-6 text-sm text-app-subtle">
                    На этот день ничего не запланировано.
                  </p>
                ) : null}
              </section>
              )}

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
                  Без даты
                </h2>
                {undated.length > 0 ? (
                  <TodoList
                    todos={undated}
                    onUpdated={handleTodoUpdated}
                    onDeleted={handleTodoDeleted}
                  />
                ) : (
                  <p className="text-sm text-app-subtle">
                    Все задачи с указанным сроком.
                  </p>
                )}
              </section>

              {calendarView === "month" && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
                    Задачи месяца
                  </h2>
                  <p className="text-sm text-app-subtle">
                    {monthTodos.length
                      ? `${monthTodos.length} · ${formatMonthTitle(month)}`
                      : formatMonthTitle(month)}
                  </p>
                </div>
                {monthTodos.length > 0 ? (
                  <TodoList
                    todos={monthTodos}
                    onUpdated={handleTodoUpdated}
                    onDeleted={handleTodoDeleted}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-app px-4 py-6 text-sm text-app-subtle">
                    В этом месяце нет задач со сроком или повтором.
                  </p>
                )}
              </section>
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
          onNavigate={() => setSidebarOpen(false)}
          className="border-0 bg-transparent p-0"
        />
      </MobileSidebarDrawer>
    </div>
  );
}
