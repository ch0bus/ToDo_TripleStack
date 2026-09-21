import { dueDateKey, parseDateKey, toDateKey } from "@/lib/calendar";
import { isRecurring, nextDueDate, type RecurrenceValue } from "@/lib/recurrence";

export const DEFAULT_EVENT_COLOR = "#e11d48";

export const EVENT_COLOR_PRESETS = [
  "#e11d48",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#64748b",
] as const;

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  recurrence: RecurrenceValue | string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type EventEntry = {
  event: CalendarEvent;
  dateKey: string;
  occurrenceStartKey: string;
  virtual: boolean;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function spanDays(event: CalendarEvent): number {
  const start = new Date(event.start_at);
  if (Number.isNaN(start.getTime())) return 0;
  if (!event.end_at) return 0;
  const end = new Date(event.end_at);
  if (Number.isNaN(end.getTime())) return 0;
  const a = startOfLocalDay(start);
  const b = startOfLocalDay(end);
  if (b < a) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function pushEntry(map: Map<string, EventEntry[]>, entry: EventEntry) {
  const list = map.get(entry.dateKey) ?? [];
  list.push(entry);
  map.set(entry.dateKey, list);
}

function paintOccurrence(
  map: Map<string, EventEntry[]>,
  event: CalendarEvent,
  occurrenceStart: Date,
  originKey: string,
  rangeFrom: string,
  rangeTo: string,
) {
  const occurrenceStartKey = toDateKey(occurrenceStart);
  const virtual = occurrenceStartKey !== originKey;
  const days = spanDays(event);
  for (let i = 0; i <= days; i += 1) {
    const key = toDateKey(addDays(occurrenceStart, i));
    if (key < rangeFrom || key > rangeTo) continue;
    pushEntry(map, {
      event,
      dateKey: key,
      occurrenceStartKey,
      virtual,
    });
  }
}

/** События и повторы на каждый день видимого окна. */
export function groupEventsForRange(
  events: CalendarEvent[],
  rangeFrom: string,
  rangeTo: string,
): Map<string, EventEntry[]> {
  const map = new Map<string, EventEntry[]>();

  for (const event of events) {
    const start = new Date(event.start_at);
    if (Number.isNaN(start.getTime())) continue;
    const originKey = dueDateKey(event.start_at);
    if (!originKey) continue;

    paintOccurrence(map, event, start, originKey, rangeFrom, rangeTo);

    if (!isRecurring(event.recurrence)) continue;

    let cursor = nextDueDate(start, event.recurrence);
    let guard = 0;
    const span = spanDays(event);
    while (guard < 2000 && toDateKey(addDays(cursor, span)) < rangeFrom) {
      cursor = nextDueDate(cursor, event.recurrence);
      guard += 1;
    }
    while (guard < 2400) {
      if (toDateKey(cursor) > rangeTo) break;
      paintOccurrence(map, event, cursor, originKey, rangeFrom, rangeTo);
      cursor = nextDueDate(cursor, event.recurrence);
      guard += 1;
    }
  }

  return map;
}

export function uniqueEventEntries(entries: EventEntry[]): EventEntry[] {
  const seen = new Set<string>();
  const list: EventEntry[] = [];
  for (const entry of entries) {
    const id = `${entry.event.id}-${entry.occurrenceStartKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    list.push(entry);
  }
  return list.sort((a, b) => a.event.start_at.localeCompare(b.event.start_at));
}

/** Уникальные события диапазона: одна строка на событие, первое вхождение. */
export function uniqueEventsInRange(
  byDay: Map<string, EventEntry[]>,
  rangeFrom: string,
  rangeTo: string,
): EventEntry[] {
  const seen = new Set<number>();
  const list: EventEntry[] = [];
  const keys = [...byDay.keys()].sort();
  for (const key of keys) {
    if (key < rangeFrom || key > rangeTo) continue;
    for (const entry of uniqueEventEntries(byDay.get(key) ?? [])) {
      if (seen.has(entry.event.id)) continue;
      seen.add(entry.event.id);
      list.push(entry);
    }
  }
  return list;
}

export const EVENT_SORTS = ["start", "new", "title"] as const;
export type EventSort = (typeof EVENT_SORTS)[number];

export const EVENT_SORT_OPTIONS: { value: EventSort; label: string }[] = [
  { value: "start", label: "По времени" },
  { value: "new", label: "Новые сверху" },
  { value: "title", label: "По названию" },
];

export function parseEventSort(
  value: string | null | undefined,
  fallback: EventSort = "start",
): EventSort {
  if (value && (EVENT_SORTS as readonly string[]).includes(value)) {
    return value as EventSort;
  }
  return fallback;
}

function occurrenceTime(entry: EventEntry): number {
  const date = parseDateKey(entry.occurrenceStartKey);
  if (!date) {
    const start = new Date(entry.event.start_at);
    return Number.isNaN(start.getTime()) ? 0 : start.getTime();
  }
  if (entry.event.all_day) return date.getTime();
  const start = new Date(entry.event.start_at);
  if (Number.isNaN(start.getTime())) return date.getTime();
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
  ).getTime();
}

export function filterEventsByColor(
  entries: EventEntry[],
  color: string | null | undefined,
): EventEntry[] {
  if (!color) return entries;
  return entries.filter((entry) => entry.event.color === color);
}

export function sortEventEntries(
  entries: EventEntry[],
  sort: EventSort,
): EventEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === "new") {
      return (
        b.event.created_at.localeCompare(a.event.created_at) ||
        a.event.id - b.event.id
      );
    }
    if (sort === "title") {
      return (
        a.event.title.localeCompare(b.event.title, "ru") ||
        occurrenceTime(a) - occurrenceTime(b)
      );
    }
    return occurrenceTime(a) - occurrenceTime(b) || a.event.id - b.event.id;
  });
}

export function eventColorsInList(entries: EventEntry[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const preset of EVENT_COLOR_PRESETS) {
    seen.add(preset);
    colors.push(preset);
  }
  for (const entry of entries) {
    const color = entry.event.color || DEFAULT_EVENT_COLOR;
    if (seen.has(color)) continue;
    seen.add(color);
    colors.push(color);
  }
  return colors;
}

export function formatEventWhen(event: CalendarEvent): string {
  const start = new Date(event.start_at);
  if (Number.isNaN(start.getTime())) return "";
  if (event.all_day) {
    if (!event.end_at) return "весь день";
    const end = new Date(event.end_at);
    if (Number.isNaN(end.getTime())) return "весь день";
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    if (startKey === endKey) return "весь день";
    return `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
  }
  const startTime = start.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!event.end_at) return startTime;
  const end = new Date(event.end_at);
  if (Number.isNaN(end.getTime())) return startTime;
  const endTime = end.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (toDateKey(start) === toDateKey(end)) return `${startTime}–${endTime}`;
  return `${startTime} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} ${endTime}`;
}

export function formatEventEntryWhen(
  entry: EventEntry,
  includeDate = false,
): string {
  const when = formatEventWhen(entry.event);
  if (!includeDate) return when;
  const date = parseDateKey(entry.dateKey);
  if (!date) return when;
  const label = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  return when ? `${label} · ${when}` : label;
}
