import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { TodayHalo } from "@/components/CalendarNoteMarks";
import { CalendarOccurrenceRow } from "@/components/CalendarOccurrenceRow";
import { CalendarTimeGrid } from "@/components/CalendarTimeGrid";
import { CalendarViewSwitch } from "@/components/CalendarViewSwitch";
import { CalendarYearGrid } from "@/components/CalendarYearGrid";
import { CreateAddMenu } from "@/components/CreateAddMenu";
import { DayNoteEditor } from "@/components/DayNoteEditor";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { EventFilterBar } from "@/components/EventFilterBar";
import { EventList } from "@/components/EventList";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { MonthDayBars, collectDayBars } from "@/components/MonthDayBars";
import { MonthShiftFill } from "@/components/MonthShiftFill";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { ShiftCalendarPicker } from "@/components/ShiftCalendarPicker";
import { ShiftDaySummary } from "@/components/ShiftDaySummary";
import { ShiftPaintBar } from "@/components/ShiftPaintBar";
import { SortBar } from "@/components/SortBar";
import { TodoItem } from "@/components/TodoItem";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { useAppShell } from "@/contexts/AppShellContext";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  addYears,
  buildMonthGrid,
  formatDayTitle,
  formatMonthName,
  formatMonthTitle,
  formatWeekRangeTitle,
  groupTodosForMonth,
  parseCalendarView,
  parseDateKey,
  parseMonthKey,
  sortCalendarEntries,
  startOfWeek,
  uniqueTodosInMonth,
  type CalendarEntry,
  type CalendarView,
  startOfMonth,
  toDateKey,
  toMonthKey,
  weekDates,
} from "@/lib/calendar";
import { dayNotesMap, type DayNote } from "@/lib/dayNotes";
import {
  EVENT_SORT_OPTIONS,
  eventColorsInList,
  filterEventsByColor,
  groupEventsForRange,
  parseEventSort,
  sortEventEntries,
  uniqueEventEntries,
  uniqueEventsInMonth,
  type CalendarEvent,
} from "@/lib/events";
import {
  nextShiftCalendarName,
  markColors,
  shiftMarksByDate,
  summarizeShiftDays,
  type PaintTool,
  type ShiftCalendar,
  type ShiftDay,
  type ShiftKind,
  type ShiftLayer,
} from "@/lib/shifts";
import { shiftSettingsPath } from "@/lib/nav";
import type { TagOption } from "@/lib/tags";
import { parseTodoSort, sortTodos } from "@/lib/todoSort";
import { pluralRu } from "@/lib/utils";

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
  const navigate = useNavigate();
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
  const [shiftDays, setShiftDays] = useState<ShiftDay[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [paint, setPaint] = useState<PaintTool>({ type: "select" });
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const [showPaint, setShowPaint] = useState(false);

  const hasToken = !!getAccessToken();
  const today = useMemo(() => new Date(), []);

  const month = useMemo(() => {
    return parseMonthKey(searchParams.get("month") ?? "") ?? startOfMonth(today);
  }, [searchParams, today]);

  const calendarView = parseCalendarView(searchParams.get("view"));
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
  const weekStart = useMemo(() => startOfWeek(selectedDay), [selectedDay]);
  const weekDays = useMemo(() => weekDates(weekStart), [weekStart]);
  const rangeFrom = cells[0]?.key;
  const rangeTo = cells[cells.length - 1]?.key;
  const yearFrom = `${month.getFullYear()}-01-01`;
  const yearTo = `${month.getFullYear()}-12-31`;
  const weekFrom = toDateKey(weekStart);
  const weekTo = toDateKey(weekDays[6] ?? weekStart);
  const dayKey = toDateKey(selectedDay);
  const queryFrom =
    calendarView === "year"
      ? yearFrom
      : calendarView === "week"
        ? weekFrom
        : calendarView === "day"
          ? dayKey
          : rangeFrom;
  const queryTo =
    calendarView === "year"
      ? yearTo
      : calendarView === "week"
        ? weekTo
        : calendarView === "day"
          ? dayKey
          : rangeTo;
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
  const monthTodosUnsorted = useMemo(
    () => uniqueTodosInMonth(cells, byDay),
    [cells, byDay],
  );
  const monthSort = parseTodoSort(searchParams.get("sort"), "due");
  const monthTodos = useMemo(
    () => sortTodos(monthTodosUnsorted, monthSort),
    [monthTodosUnsorted, monthSort],
  );
  const monthEventsUnsorted = useMemo(
    () => uniqueEventsInMonth(cells, eventsByDay),
    [cells, eventsByDay],
  );
  const eventColor = searchParams.get("ecolor");
  const eventSort = parseEventSort(searchParams.get("esort"), "start");
  const monthEvents = useMemo(
    () =>
      sortEventEntries(
        filterEventsByColor(monthEventsUnsorted, eventColor),
        eventSort,
      ),
    [monthEventsUnsorted, eventColor, eventSort],
  );
  const eventFilterColors = useMemo(
    () => eventColorsInList(monthEventsUnsorted),
    [monthEventsUnsorted],
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
  const weekLayerTotals = useMemo(
    () =>
      shiftLayers.map((layer) => ({
        layer,
        totals: summarizeShiftDays(shiftDays, weekFrom, weekTo, layer.id),
      })),
    [shiftLayers, shiftDays, weekFrom, weekTo],
  );
  const dayLayerTotals = useMemo(
    () =>
      shiftLayers.map((layer) => ({
        layer,
        totals: summarizeShiftDays(shiftDays, dayKey, dayKey, layer.id),
      })),
    [shiftLayers, shiftDays, dayKey],
  );

  const loadCalendars = useCallback(async () => {
    const res = await apiFetch("/shift-calendars/");
    if (res.ok) setShiftCalendars((await res.json()) as ShiftCalendar[]);
  }, []);

  const loadShifts = useCallback(async () => {
    if (!queryFrom || !queryTo || !selectedShiftCalendar) return;
    const calendarQ = `calendar=${selectedShiftCalendar.id}`;
    const [layersRes, kindsRes, daysRes] = await Promise.all([
      apiFetch(`/shift-layers/?${calendarQ}`),
      apiFetch(`/shift-kinds/?${calendarQ}`),
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
    if (calendarView === "month") return;
    setShowPaint(false);
    setPaint({ type: "select" });
  }, [calendarView]);

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

  function writeView(params: URLSearchParams, view: CalendarView) {
    if (view === "month") params.delete("view");
    else params.set("view", view);
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

  function setCalendarView(next: CalendarView) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      writeView(params, next);
      if (!params.get("day")) params.set("day", toDateKey(selectedDay));
      params.set("month", toMonthKey(selectedDay));
      return params;
    });
  }

  function handleToday() {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(today));
      params.set("day", toDateKey(today));
      writeView(params, calendarView);
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

  function selectDay(date: Date) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("month", toMonthKey(date));
      params.set("day", toDateKey(date));
      writeView(params, calendarView);
      return params;
    });
  }

  function shiftPeriod(delta: number) {
    if (calendarView === "day") {
      selectDay(addDays(selectedDay, delta));
      return;
    }
    if (calendarView === "week") {
      selectDay(addDays(selectedDay, delta * 7));
      return;
    }
    if (calendarView === "year") {
      setMonth(addYears(month, delta));
      return;
    }
    setMonth(addMonths(month, delta));
  }

  async function handleDayClick(date: Date) {
    selectDay(date);
    const key = toDateKey(date);
    if (!showPaint || paint.type === "select" || !activeLayer) return;
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

  function handleTogglePaint() {
    if (showPaint) {
      setPaint({ type: "select" });
      setShowPaint(false);
    } else {
      setShowPaint(true);
    }
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
    const fromParams = new URLSearchParams(location.search);
    fromParams.set("calendar", String(created.id));
    navigate(shiftSettingsPath(created.id), {
      state: { from: `${location.pathname}?${fromParams.toString()}` },
    });
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

  const paintBar =
    showPaint && activeLayer ? (
      <div className="rounded-xl border border-app bg-app-surface px-3 py-2.5">
        <ShiftPaintBar
          layers={shiftLayers}
          activeLayer={activeLayer}
          kinds={activeKinds}
          paint={paint}
          onActiveLayerChange={handleActiveLayerChange}
          onPaintChange={setPaint}
        />
      </div>
    ) : null;

  const periodTotals =
    calendarView === "year"
      ? yearLayerTotals
      : calendarView === "week"
        ? weekLayerTotals
        : calendarView === "day"
          ? dayLayerTotals
          : monthLayerTotals;

  const shiftSummary = (
    <ShiftDaySummary
      layers={shiftLayers}
      marks={selectedMarks}
      totals={periodTotals}
      periodLabel={(layer) =>
        calendarView === "year"
          ? `За ${month.getFullYear()} · ${layer.name}`
          : calendarView === "week"
            ? `За неделю · ${layer.name}`
            : calendarView === "day"
              ? `За день · ${layer.name}`
              : `За ${formatMonthName(month).toLowerCase()} · ${layer.name}`
      }
      calendarId={selectedShiftCalendar?.id}
      painting={showPaint}
      onTogglePaint={
        calendarView === "month" ? handleTogglePaint : undefined
      }
    />
  );

  const pickerLabel =
    calendarView === "day"
      ? formatDayTitle(selectedDay)
      : calendarView === "week"
        ? formatWeekRangeTitle(weekStart)
        : undefined;

  const periodAria =
    calendarView === "day"
      ? "Предыдущий день"
      : calendarView === "week"
        ? "Предыдущая неделя"
        : calendarView === "year"
          ? "Предыдущий год"
          : "Предыдущий месяц";
  const periodAriaNext =
    calendarView === "day"
      ? "Следующий день"
      : calendarView === "week"
        ? "Следующая неделя"
        : calendarView === "year"
          ? "Следующий год"
          : "Следующий месяц";

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
                <div className="w-full md:w-auto md:min-w-[10rem]">
                  <CreateAddMenu
                    day={selectedKey}
                    hasNote={Boolean(selectedNote)}
                  />
                </div>
              </div>
              <CalendarViewSwitch
                value={calendarView}
                onChange={setCalendarView}
              />
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => shiftPeriod(-1)}
                    className="shrink-0 rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
                    aria-label={periodAria}
                  >
                    ←
                  </button>
                  <MonthYearPicker
                    value={month}
                    mode={calendarView === "year" ? "year" : "month"}
                    label={pickerLabel}
                    onChange={setMonth}
                    onToday={handleToday}
                  />
                  <button
                    type="button"
                    onClick={() => shiftPeriod(1)}
                    className="shrink-0 rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
                    aria-label={periodAriaNext}
                  >
                    →
                  </button>
              </div>
              </div>

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
                  onSelectDay={(date) => void handleDayClick(date)}
                />
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold capitalize text-app">
                    {formatDayTitle(selectedDay)}
                  </h2>
                  {shiftSummary}
                  {selectedEventEntries.length > 0 && (
                    <EventList
                      className="pt-2"
                      entries={selectedEventEntries}
                      onDeleted={handleEventDeleted}
                    />
                  )}
                </section>
                </>
              ) : calendarView === "day" || calendarView === "week" ? (
                <>
                  <CalendarTimeGrid
                    days={calendarView === "day" ? [selectedDay] : weekDays}
                    today={today}
                    selectedKey={selectedKey}
                    eventsByDay={eventsByDay}
                    notesByDay={notesByDay}
                    shiftsByDay={shiftsByDay}
                    shiftLayers={shiftLayers}
                    onSelectDay={selectDay}
                  />
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
                    {shiftSummary}
                    <DayNoteEditor
                      dateKey={selectedKey}
                      note={selectedNote}
                      onChanged={handleNoteChanged}
                    />
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
                    ) : null}
                  </section>
                </>
              ) : (
              <>
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
                    const selected = cell.key === selectedKey;
                    const dayMarks = shiftsByDay.get(cell.key);
                    const note = notesByDay.get(cell.key);
                    const dayEvents = eventsByDay.get(cell.key) ?? [];
                    const eventTitles = uniqueEventEntries(dayEvents).map(
                      (entry) => entry.event.title,
                    );
                    const colors = markColors(dayMarks);
                    const dayBars = collectDayBars(
                      dayEvents,
                      dayEntries,
                      note?.text,
                    );
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
                            ...dayEntries.map((entry) => entry.todo.title),
                            note?.text,
                          ]
                            .filter(Boolean)
                            .join(" · ") || undefined
                        }
                        className={
                          "relative flex min-h-[4.5rem] flex-col overflow-hidden border-b border-r border-app px-1 py-1 text-left last:border-r-0 sm:min-h-28 sm:px-1.5 sm:py-1.5 " +
                          (selected
                            ? "bg-[var(--app-accent-soft)]"
                            : "hover:bg-app-surface-muted") +
                          (cell.inMonth ? "" : " opacity-40")
                        }
                      >
                        <MonthShiftFill colors={colors} />
                        <span className="relative isolate inline-flex h-7 w-7 shrink-0 items-center justify-center text-xs">
                          {cell.isToday ? <TodayHalo size={28} /> : null}
                          <span
                            className={
                              "relative " +
                              (selected
                                ? "font-semibold text-app-accent"
                                : cell.isToday
                                  ? "font-semibold text-app"
                                  : "text-app-muted")
                            }
                          >
                            {cell.date.getDate()}
                          </span>
                        </span>
                        <MonthDayBars items={dayBars} />
                      </button>
                    );
                  })}
                </div>
              </div>
              {paintBar}
              </>
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
                {shiftSummary}
                <DayNoteEditor
                  dateKey={selectedKey}
                  note={selectedNote}
                  onChanged={handleNoteChanged}
                />
                {selectedEventEntries.length > 0 && (
                  <EventList
                    entries={selectedEventEntries}
                    onDeleted={handleEventDeleted}
                  />
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
              <>
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
                    Задачи месяца
                    <span className="ml-2 font-normal text-app-subtle">
                      {monthTodos.length
                        ? `${monthTodos.length} · ${formatMonthTitle(month)}`
                        : formatMonthTitle(month)}
                    </span>
                  </h2>
                  <SortBar defaultSort="due" />
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
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
                    События месяца
                    <span className="ml-2 font-normal text-app-subtle">
                      {monthEvents.length
                        ? `${monthEvents.length} · ${formatMonthTitle(month)}`
                        : formatMonthTitle(month)}
                    </span>
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <EventFilterBar colors={eventFilterColors} />
                    <SortBar
                      paramName="esort"
                      defaultSort="start"
                      options={EVENT_SORT_OPTIONS}
                      label="Сортировка событий"
                    />
                  </div>
                </div>
                {monthEvents.length > 0 ? (
                  <EventList
                    entries={monthEvents}
                    onDeleted={handleEventDeleted}
                    showDate
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-app px-4 py-6 text-sm text-app-subtle">
                    {monthEventsUnsorted.length
                      ? "Нет событий выбранного цвета."
                      : "В этом месяце нет событий."}
                  </p>
                )}
              </section>
              </>
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
