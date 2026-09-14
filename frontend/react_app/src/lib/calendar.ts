import type { TodoRow } from "@/components/TodoList";
import { isRecurring, nextDueDate } from "@/lib/recurrence";
import { calendarAnchorIso } from "@/lib/utils";

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

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

/** Уникальные задачи, которые попадают на дни выбранного месяца (срок или повтор). */
export function uniqueTodosInMonth(
  cells: CalendarCell[],
  byDay: Map<string, CalendarEntry[]>,
): TodoRow[] {
  const seen = new Set<number>();
  const list: TodoRow[] = [];
  for (const cell of cells) {
    if (!cell.inMonth) continue;
    for (const entry of byDay.get(cell.key) ?? []) {
      if (seen.has(entry.todo.id)) continue;
      seen.add(entry.todo.id);
      list.push(entry.todo);
    }
  }
  return list.sort((a, b) => {
    const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
    const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
    return aTime - bTime;
  });
}

export function formatMonthTitle(date: Date): string {
  const raw = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMonthName(date: Date): string {
  const raw = date.toLocaleDateString("ru-RU", { month: "long" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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
