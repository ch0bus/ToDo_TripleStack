import { addDays, parseDateKey, WEEKDAY_LABELS, type CalendarEntry } from "@/lib/calendar";
import { uniqueEventEntries, type EventEntry } from "@/lib/events";
import { eventPath } from "@/lib/nav";
import { calendarAnchorIso, isOverdue } from "@/lib/utils";

export const HOUR_HEIGHT = 52;
export const GRID_HOURS = 24;
export const MIN_EVENT_MINUTES = 25;
const DEFAULT_TASK_MINUTES = 60;

export type TimedBlock = {
  key: string;
  title: string;
  to: string;
  startMin: number;
  endMin: number;
  color: string;
  kind: "event" | "todo";
  sort: number;
  attended?: boolean;
};

export type LaidOutBlock = TimedBlock & {
  col: number;
  colCount: number;
};

export function isDateOnlyTime(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return true;
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
}

function occurrenceLocalStart(entry: EventEntry): Date | null {
  const origin = new Date(entry.event.start_at);
  if (Number.isNaN(origin.getTime())) return null;
  const occ = parseDateKey(entry.occurrenceStartKey);
  if (!occ) return origin;
  return new Date(
    occ.getFullYear(),
    occ.getMonth(),
    occ.getDate(),
    origin.getHours(),
    origin.getMinutes(),
    origin.getSeconds(),
  );
}

function occurrenceLocalEnd(entry: EventEntry): Date | null {
  const start = occurrenceLocalStart(entry);
  if (!start) return null;
  if (!entry.event.end_at) return new Date(start.getTime() + 60 * 60 * 1000);
  const originStart = new Date(entry.event.start_at);
  const originEnd = new Date(entry.event.end_at);
  if (Number.isNaN(originStart.getTime()) || Number.isNaN(originEnd.getTime())) {
    return new Date(start.getTime() + 60 * 60 * 1000);
  }
  const duration = Math.max(originEnd.getTime() - originStart.getTime(), 15 * 60 * 1000);
  return new Date(start.getTime() + duration);
}

export function eventMinutesOnDay(entry: EventEntry, dateKey: string): TimedBlock | null {
  if (entry.event.all_day) return null;
  const start = occurrenceLocalStart(entry);
  const end = occurrenceLocalEnd(entry);
  const day = parseDateKey(dateKey);
  if (!start || !end || !day) return null;
  const dayStart = day.getTime();
  const dayEnd = addDays(day, 1).getTime();
  const clipStart = Math.max(start.getTime(), dayStart);
  const clipEnd = Math.min(end.getTime(), dayEnd);
  if (clipEnd <= clipStart) return null;
  let startMin = (clipStart - dayStart) / 60_000;
  let endMin = (clipEnd - dayStart) / 60_000;
  if (endMin - startMin < MIN_EVENT_MINUTES) {
    endMin = Math.min(24 * 60, startMin + MIN_EVENT_MINUTES);
  }
  return {
    key: `e-${entry.event.id}-${entry.occurrenceStartKey}-${dateKey}`,
    title: entry.event.title,
    to: eventPath(entry.event.id),
    startMin,
    endMin,
    color: entry.event.color,
    kind: "event",
    sort: entry.event.id,
    attended: entry.attended,
  };
}

export function allDayEventEntries(entries: EventEntry[]): EventEntry[] {
  return uniqueEventEntries(entries.filter((entry) => entry.event.all_day));
}

function uniqueTodos(entries: CalendarEntry[]): CalendarEntry[] {
  const seen = new Set<number>();
  const list: CalendarEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.todo.id)) continue;
    seen.add(entry.todo.id);
    list.push(entry);
  }
  return list;
}

export function allDayTodoEntries(entries: CalendarEntry[]): CalendarEntry[] {
  return uniqueTodos(entries).filter((entry) => {
    const anchor = calendarAnchorIso(entry.todo);
    return Boolean(anchor && isDateOnlyTime(anchor));
  });
}

function clipMinutes(
  start: Date,
  end: Date,
  dateKey: string,
): { startMin: number; endMin: number } | null {
  const day = parseDateKey(dateKey);
  if (!day) return null;
  const dayStart = day.getTime();
  const dayEnd = addDays(day, 1).getTime();
  const clipStart = Math.max(start.getTime(), dayStart);
  const clipEnd = Math.min(end.getTime(), dayEnd);
  if (clipEnd <= clipStart) return null;
  let startMin = (clipStart - dayStart) / 60_000;
  let endMin = (clipEnd - dayStart) / 60_000;
  if (endMin - startMin < MIN_EVENT_MINUTES) {
    endMin = Math.min(24 * 60, startMin + MIN_EVENT_MINUTES);
  }
  return { startMin, endMin };
}

export function timedTodoBlocksForDay(
  entries: CalendarEntry[],
  dateKey: string,
): TimedBlock[] {
  const day = parseDateKey(dateKey);
  if (!day) return [];
  const blocks: TimedBlock[] = [];
  for (const entry of uniqueTodos(entries)) {
    const anchor = calendarAnchorIso(entry.todo);
    if (!anchor || isDateOnlyTime(anchor)) continue;
    const origin = new Date(anchor);
    const start = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      origin.getHours(),
      origin.getMinutes(),
      origin.getSeconds(),
    );
    const end = new Date(start.getTime() + DEFAULT_TASK_MINUTES * 60_000);
    const clip = clipMinutes(start, end, dateKey);
    if (!clip) continue;
    const overdue =
      !entry.virtual && isOverdue(entry.todo.due_date, entry.todo.status);
    blocks.push({
      key: `t-${entry.todo.id}-${entry.dateKey}`,
      title: entry.todo.title,
      to: `/todos/${entry.todo.id}`,
      startMin: clip.startMin,
      endMin: clip.endMin,
      color: overdue ? "#ef4444" : "var(--app-accent)",
      kind: "todo",
      sort: entry.todo.id,
    });
  }
  return blocks;
}

export function timedBlocksForDay(
  events: EventEntry[],
  todos: CalendarEntry[],
  dateKey: string,
): TimedBlock[] {
  const blocks: TimedBlock[] = [];
  const seen = new Set<string>();
  for (const entry of uniqueEventEntries(events)) {
    if (entry.event.all_day) continue;
    const id = `${entry.event.id}-${entry.occurrenceStartKey}`;
    if (seen.has(id)) continue;
    const block = eventMinutesOnDay(entry, dateKey);
    if (!block) continue;
    seen.add(id);
    blocks.push(block);
  }
  blocks.push(...timedTodoBlocksForDay(todos, dateKey));
  return blocks;
}

export function layoutTimedBlocks(blocks: TimedBlock[]): LaidOutBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.sort - b.sort,
  );
  const colEnds: number[] = [];
  const laid: LaidOutBlock[] = [];
  for (const block of sorted) {
    let col = colEnds.findIndex((end) => end <= block.startMin);
    if (col < 0) {
      col = colEnds.length;
      colEnds.push(block.endMin);
    } else {
      colEnds[col] = block.endMin;
    }
    laid.push({ ...block, col, colCount: 1 });
  }
  for (const a of laid) {
    let lastCol = a.col;
    for (const b of laid) {
      if (a.startMin < b.endMin && b.startMin < a.endMin) {
        lastCol = Math.max(lastCol, b.col);
      }
    }
    a.colCount = lastCol + 1;
  }
  return laid;
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatHourLabel(hour: number): string {
  return `${hour}:00`;
}

export function formatDayColumnLabel(date: Date): string {
  const weekday = WEEKDAY_LABELS[(date.getDay() + 6) % 7];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${weekday} ${day}.${month}`;
}

export function blockTop(startMin: number): number {
  return (startMin / 60) * HOUR_HEIGHT;
}

export function blockHeight(startMin: number, endMin: number): number {
  return Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 18);
}
