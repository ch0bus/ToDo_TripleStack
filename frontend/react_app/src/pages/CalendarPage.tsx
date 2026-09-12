import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { CalendarOccurrenceRow } from "@/components/CalendarOccurrenceRow";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { MobileSidebarDrawer } from "@/components/MobileSidebarDrawer";
import { ShiftSchedulePanel } from "@/components/ShiftSchedulePanel";
import { TodoFormModal } from "@/components/TodoFormModal";
import { TodoItem } from "@/components/TodoItem";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { useAppShell } from "@/contexts/AppShellContext";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  WEEKDAY_LABELS,
  addMonths,
  buildMonthGrid,
  defaultDueAtDay,
  formatDayTitle,
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
import {
  shiftDayFillStyle,
  shiftDaysMap,
  type PaintTool,
  type ShiftDay,
  type ShiftKind,
  type ShiftPattern,
} from "@/lib/shifts";
import type { TagOption } from "@/lib/tags";
import { btnPrimary } from "@/lib/uiClasses";
import { isOverdue, pluralRu, toDatetimeLocalValue } from "@/lib/utils";

const emptyPattern: ShiftPattern = { start_date: null, slots: [] };

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shiftKinds, setShiftKinds] = useState<ShiftKind[]>([]);
  const [shiftPattern, setShiftPattern] = useState<ShiftPattern>(emptyPattern);
  const [shiftDays, setShiftDays] = useState<ShiftDay[]>([]);
  const [paint, setPaint] = useState<PaintTool>({ type: "select" });

  const hasToken = !!getAccessToken();
  const today = useMemo(() => new Date(), []);

  const month = useMemo(() => {
    return parseMonthKey(searchParams.get("month") ?? "") ?? startOfMonth(today);
  }, [searchParams, today]);

  const selectedDay = useMemo(() => {
    const fromUrl = parseDateKey(searchParams.get("day") ?? "");
    if (fromUrl) return fromUrl;
    if (
      today.getFullYear() === month.getFullYear() &&
      today.getMonth() === month.getMonth()
    ) {
      return today;
    }
    return startOfMonth(month);
  }, [searchParams, month, today]);

  const cells = useMemo(() => buildMonthGrid(month, today), [month, today]);
  const rangeFrom = cells[0]?.key;
  const rangeTo = cells[cells.length - 1]?.key;
  const byDay = useMemo(() => {
    if (!rangeFrom || !rangeTo) return new Map<string, CalendarEntry[]>();
    return groupTodosForMonth(todos, rangeFrom, rangeTo);
  }, [todos, rangeFrom, rangeTo]);
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
  const selectedRealCount = selectedEntries.filter((entry) => !entry.virtual).length;
  const selectedRepeatCount = selectedEntries.length - selectedRealCount;
  const shiftsByDay = useMemo(() => shiftDaysMap(shiftDays), [shiftDays]);
  const selectedShift = shiftsByDay.get(selectedKey);

  const loadShifts = useCallback(async () => {
    if (!rangeFrom || !rangeTo) return;
    const [kindsRes, patternRes, daysRes] = await Promise.all([
      apiFetch("/shift-kinds/"),
      apiFetch("/shift-pattern/"),
      apiFetch(`/shift-days/?from=${rangeFrom}&to=${rangeTo}`),
    ]);
    if (kindsRes.ok) setShiftKinds((await kindsRes.json()) as ShiftKind[]);
    if (patternRes.ok) {
      setShiftPattern((await patternRes.json()) as ShiftPattern);
    }
    if (daysRes.ok) setShiftDays((await daysRes.json()) as ShiftDay[]);
  }, [rangeFrom, rangeTo]);

  const load = useCallback(async () => {
    const [todosRes, tagsRes] = await Promise.all([
      apiFetch("/todos/"),
      apiFetch("/tags/"),
    ]);
    if (!todosRes.ok) throw new Error("Failed to load todos");
    setTodos((await todosRes.json()) as TodoRow[]);
    if (tagsRes.ok) setTags((await tagsRes.json()) as TagOption[]);
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
    void loadShifts();
  }, [loadShifts]);

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
    if (paint.type === "select") return;
    try {
      if (paint.type === "pattern") {
        await apiFetch(`/shift-days/${key}/`, { method: "DELETE" });
      } else {
        const res = await apiFetch("/shift-days/", {
          method: "PUT",
          body: JSON.stringify({
            date: key,
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

  async function handleCreateKind(name: string, color: string) {
    const res = await apiFetch("/shift-kinds/", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error("create kind failed");
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
    kindIds: Array<number | null>,
  ) {
    const res = await apiFetch("/shift-pattern/", {
      method: "PUT",
      body: JSON.stringify({
        start_date: startDate,
        slots: kindIds.map((kind_id) => ({ kind_id })),
      }),
    });
    if (!res.ok) throw new Error("save pattern failed");
    await loadShifts();
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

  async function handleTodoCreated() {
    try {
      await load();
    } catch {
      /* ignore */
    }
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      {error && (
        <div className="chip-danger mb-4 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_240px)_minmax(0,_1fr)]">
        <div className="hidden lg:block">
          <DashboardSidebar
            tags={tags}
            onNewTask={() => setShowForm(true)}
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonth(addMonths(month, -1))}
                    className="rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
                    aria-label="Предыдущий месяц"
                  >
                    ←
                  </button>
                  <h1 className="min-w-[12rem] text-center text-xl font-semibold text-app">
                    {formatMonthTitle(month)}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setMonth(addMonths(month, 1))}
                    className="rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
                    aria-label="Следующий месяц"
                  >
                    →
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectDay(today)}
                    className="rounded-md border border-app px-3 py-1.5 text-sm text-app-muted hover:bg-app-surface-muted hover:text-app"
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className={btnPrimary + " shrink-0"}
                  >
                    + Новая задача
                  </button>
                </div>
              </div>

              <ShiftSchedulePanel
                kinds={shiftKinds}
                pattern={shiftPattern}
                paint={paint}
                onPaintChange={setPaint}
                onCreateKind={handleCreateKind}
                onDeleteKind={handleDeleteKind}
                onSavePattern={handleSavePattern}
              />

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
                    const shift = shiftsByDay.get(cell.key);
                    const shiftColor = shift?.kind?.color;
                    const marks = Math.min(realCount, 3);
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => void handleDayClick(cell.date)}
                        title={
                          [
                            shift?.kind?.name,
                            repeatCount
                              ? `${repeatCount} ${pluralRu(repeatCount, "повтор", "повтора", "повторов")}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || undefined
                        }
                        className={
                          "min-h-16 border-b border-r border-app px-1.5 py-1.5 text-left last:border-r-0 sm:min-h-20 " +
                          (selected
                            ? "bg-[var(--app-accent-soft)]"
                            : "hover:bg-app-surface-muted") +
                          (cell.inMonth ? "" : " opacity-40")
                        }
                        style={shiftDayFillStyle(shiftColor)}
                      >
                        <span
                          className={
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
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
                          <span className="mt-1 flex flex-wrap items-center gap-0.5">
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

              <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold capitalize text-app">
                    {formatDayTitle(selectedDay)}
                    {selectedShift?.kind && (
                      <span className="ml-2 inline-flex items-center gap-1 align-middle text-sm font-normal normal-case text-app-muted">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: selectedShift.kind.color }}
                          aria-hidden
                        />
                        {selectedShift.kind.name}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-app-subtle">
                    {selectedEntries.length
                      ? [
                          selectedRealCount
                            ? `${selectedRealCount} задач`
                            : "",
                          selectedRepeatCount
                            ? `${selectedRepeatCount} ${pluralRu(selectedRepeatCount, "повтор", "повтора", "повторов")}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Нет задач со сроком в этот день"}
                  </p>
                </div>
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
                ) : (
                  <p className="rounded-xl border border-dashed border-app px-4 py-6 text-sm text-app-subtle">
                    На этот день ничего не запланировано.
                  </p>
                )}
              </section>

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
        defaultEventDate={toDatetimeLocalValue(
          defaultDueAtDay(selectedDay).toISOString(),
        )}
        onClose={() => setShowForm(false)}
        onCreated={handleTodoCreated}
      />
    </div>
  );
}
