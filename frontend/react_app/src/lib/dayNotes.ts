import {
  addDays,
  formatMonthTitle,
  formatWeekRangeTitle,
  monthBounds,
  parseDateKey,
  startOfWeek,
  toDateKey,
  yearBounds,
} from "@/lib/calendar";
import type { TagRef } from "@/lib/tags";
import { formatDueDateShort } from "@/lib/utils";

export interface DayNote {
  date: string;
  text: string;
  tags?: TagRef[];
  updated_at?: string;
}

export function dayNotePath(dateKey: string): string {
  return `/notes/${dateKey}`;
}

export function formatDayNoteLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateKey;
  if (toDateKey(date) === toDateKey(new Date())) return "сегодня";
  return formatDueDateShort(date.toISOString());
}

export function dayNotesMap(notes: DayNote[]): Map<string, DayNote> {
  const map = new Map<string, DayNote>();
  for (const note of notes) {
    map.set(note.date, note);
  }
  return map;
}

export type NotesPeriod = "week" | "month" | "year" | "all" | "custom";

function weekBounds(day: Date): { from: string; to: string } {
  const start = startOfWeek(day);
  return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
}

export function resolveNotesRange(
  search: URLSearchParams,
  today = new Date(),
): { from: string | null; to: string | null; period: NotesPeriod } {
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  if (from && to && parseDateKey(from) && parseDateKey(to)) {
    const week = weekBounds(today);
    if (from === week.from && to === week.to) {
      return { from, to, period: "week" };
    }
    const month = monthBounds(today);
    if (from === month.from && to === month.to) {
      return { from, to, period: "month" };
    }
    const year = yearBounds(today);
    if (from === year.from && to === year.to) {
      return { from, to, period: "year" };
    }
    return { from, to, period: "custom" };
  }
  if (search.get("period") === "week") {
    const week = weekBounds(today);
    return { from: week.from, to: week.to, period: "week" };
  }
  if (search.get("period") === "month") {
    const month = monthBounds(today);
    return { from: month.from, to: month.to, period: "month" };
  }
  if (search.get("period") === "year") {
    const year = yearBounds(today);
    return { from: year.from, to: year.to, period: "year" };
  }
  return { from: null, to: null, period: "all" };
}

export function notesPeriodLabel(
  period: NotesPeriod,
  from: string | null,
  to: string | null,
  today = new Date(),
): string {
  if (period === "all") return "всё время";
  if (period === "year") return String(today.getFullYear());
  if (period === "month") return formatMonthTitle(today);
  if (period === "week") return formatWeekRangeTitle(startOfWeek(today));
  if (from && to) {
    const start = parseDateKey(from);
    const end = parseDateKey(to);
    if (start && end) {
      return `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
    }
  }
  return "";
}
