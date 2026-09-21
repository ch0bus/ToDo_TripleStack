import type { TodoRow } from "@/components/TodoList";
import { isRecurring, nextDueDate } from "@/lib/recurrence";
import { calendarAnchorIso } from "@/lib/utils";

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export const CALENDAR_VIEWS = ["day", "week", "month", "year"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const CALENDAR_VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "День" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
];

export function parseCalendarView(value: string | null | undefined): CalendarView {
  if (value === "day" || value === "week" || value === "year") return value;
  return "month";
}

export const MONTH_LABELS_SHORT = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
] as const;

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(month: Date): { from: string; to: string } {
  return {
    from: `${toMonthKey(month)}-01`,
    to: toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
  };
}

export function yearBounds(month: Date): { from: string; to: string } {
  const year = month.getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function parseMonthKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addYears(date: Date, amount: number): Date {
  return new Date(date.getFullYear() + amount, date.getMonth(), 1);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

/** Понедельник той недели, где лежит `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekStripLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth =
    weekStart.getMonth() === weekEnd.getMonth() &&
    weekStart.getFullYear() === weekEnd.getFullYear();
  if (sameMonth) return formatMonthTitle(weekStart);
  const left = MONTH_LABELS_SHORT[weekStart.getMonth()].toLowerCase();
  const right = MONTH_LABELS_SHORT[weekEnd.getMonth()].toLowerCase();
  if (weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${left}–${right} ${weekStart.getFullYear()}`;
  }
  return `${left} ${weekStart.getFullYear()}–${right} ${weekEnd.getFullYear()}`;
}

export function formatInboxDayTitle(date: Date, today = new Date()): string {
  if (toDateKey(date) === toDateKey(today)) return "Сегодня";
  return date.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export function dueDateKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(date);
}

export type CalendarCell = {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
};

export function buildMonthGrid(month: Date, today = new Date()): CalendarCell[] {
  const start = startOfMonth(month);
  const mondayOffset = (start.getDay() + 6) % 7;
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - mondayOffset);

  const cells: CalendarCell[] = [];
  const todayKey = toDateKey(today);
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: toDateKey(date) === todayKey,
    });
  }
  return cells;
}

export type CalendarEntry = {
  todo: TodoRow;
  dateKey: string;
  virtual: boolean;
};

function pushEntry(
  map: Map<string, CalendarEntry[]>,
  entry: CalendarEntry,
) {
  const list = map.get(entry.dateKey) ?? [];
  list.push(entry);
  map.set(entry.dateKey, list);
}

/** Событие (или срок) + повторы от создания до этой даты. */
export function groupTodosForMonth(
  todos: TodoRow[],
  rangeFrom: string,
  rangeTo: string,
): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();

  for (const todo of todos) {
    const anchor = calendarAnchorIso(todo);
    if (!anchor) continue;
    const anchorKey = dueDateKey(anchor);
    if (!anchorKey) continue;

    if (anchorKey >= rangeFrom && anchorKey <= rangeTo) {
      pushEntry(map, { todo, dateKey: anchorKey, virtual: false });
    }

    if (!isRecurring(todo.recurrence) || !todo.created_at) continue;
    const created = new Date(todo.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const createdKey = toDateKey(created);
    if (createdKey > anchorKey) continue;

    let cursor = new Date(created.getTime());
    let guard = 0;
    while (toDateKey(cursor) <= anchorKey && guard < 400) {
      const key = toDateKey(cursor);
      if (key >= rangeFrom && key <= rangeTo && key !== anchorKey) {
        pushEntry(map, { todo, dateKey: key, virtual: true });
      }
      cursor = nextDueDate(cursor, todo.recurrence);
      guard += 1;
    }
  }
  return map;
}

export function sortCalendarEntries(entries: CalendarEntry[]): CalendarEntry[] {
  return [...entries].sort((a, b) => {
    if (a.virtual !== b.virtual) return a.virtual ? 1 : -1;
    const aTime = a.todo.due_date ? new Date(a.todo.due_date).getTime() : 0;
    const bTime = b.todo.due_date ? new Date(b.todo.due_date).getTime() : 0;
    return aTime - bTime;
  });
}

/** Уникальные задачи, которые попадают на дни диапазона (якорь или повтор). */
export function uniqueTodosInRange(
  byDay: Map<string, CalendarEntry[]>,
  rangeFrom: string,
  rangeTo: string,
): TodoRow[] {
  const seen = new Set<number>();
  const list: TodoRow[] = [];
  const keys = [...byDay.keys()].sort();
  for (const key of keys) {
    if (key < rangeFrom || key > rangeTo) continue;
    for (const entry of byDay.get(key) ?? []) {
      if (seen.has(entry.todo.id)) continue;
      seen.add(entry.todo.id);
      list.push(entry.todo);
    }
  }
  return list;
}

export function formatMonthTitle(date: Date): string {
  const raw = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMonthName(date: Date): string {
  const raw = date.toLocaleDateString("ru-RU", { month: "long" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatWeekRangeTitle(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const y1 = weekStart.getFullYear();
  const y2 = weekEnd.getFullYear();
  if (
    weekStart.getMonth() === weekEnd.getMonth() &&
    y1 === y2
  ) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${formatMonthName(weekStart).toLowerCase()} ${y1}`;
  }
  const left = `${weekStart.getDate()} ${MONTH_LABELS_SHORT[weekStart.getMonth()].toLowerCase()}`;
  const right = `${weekEnd.getDate()} ${MONTH_LABELS_SHORT[weekEnd.getMonth()].toLowerCase()}`;
  if (y1 === y2) return `${left} – ${right} ${y1}`;
  return `${left} ${y1} – ${right} ${y2}`;
}

export function formatYearTitle(date: Date): string {
  return String(date.getFullYear());
}

export function formatDayTitle(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Начало выбранного дня в 18:00 — удобный дефолт срока из календаря. */
export function defaultDueAtDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(18, 0, 0, 0);
  return next;
}
