import { formatDueDateShort } from "@/lib/utils";
import { toDateKey } from "@/lib/calendar";

export interface DayNote {
  date: string;
  text: string;
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
