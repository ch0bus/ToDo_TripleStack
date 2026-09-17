import type { CalendarEntry } from "@/lib/calendar";
import {
  DEFAULT_EVENT_COLOR,
  uniqueEventEntries,
  type EventEntry,
} from "@/lib/events";
import { isOverdue } from "@/lib/utils";

const MOBILE_MAX = 2;
const DESKTOP_MAX = 3;

export type DayBarItem = {
  key: string;
  title: string;
  tone: "event" | "task" | "task-overdue" | "note";
  color?: string;
};

export function collectDayBars(
  events: EventEntry[],
  entries: CalendarEntry[],
  noteText?: string | null,
): DayBarItem[] {
  const items: DayBarItem[] = [];
  for (const entry of uniqueEventEntries(events)) {
    items.push({
      key: `e-${entry.event.id}-${entry.occurrenceStartKey}`,
      title: entry.event.title,
      tone: "event",
      color: entry.event.color || DEFAULT_EVENT_COLOR,
    });
  }
  const seenTodos = new Set<number>();
  for (const entry of entries) {
    if (seenTodos.has(entry.todo.id)) continue;
    seenTodos.add(entry.todo.id);
    const overdue =
      !entry.virtual && isOverdue(entry.todo.due_date, entry.todo.status);
    items.push({
      key: `t-${entry.todo.id}`,
      title: entry.todo.title,
      tone: overdue ? "task-overdue" : "task",
    });
  }
  const noteLine = noteText?.trim().split(/\n/)[0]?.trim();
  if (noteLine) {
    items.push({ key: "note", title: noteLine, tone: "note" });
  }
  return items;
}

function barClass(item: DayBarItem): string {
  if (item.tone === "note") {
    return "h-0.5 bg-[var(--calendar-note-frame)] sm:h-4";
  }
  if (item.tone === "task-overdue") {
    return "h-1 bg-red-500 sm:h-4";
  }
  if (item.tone === "task") {
    return "h-1 bg-[var(--app-accent)] sm:h-4";
  }
  return "h-1 sm:h-4";
}

export function MonthDayBars({ items }: { items: DayBarItem[] }) {
  if (items.length === 0) return null;
  const mobileExtra = Math.max(0, items.length - MOBILE_MAX);
  const desktopExtra = Math.max(0, items.length - DESKTOP_MAX);
  return (
    <div className="relative mt-1 min-w-0 space-y-0.5">
      {items.slice(0, DESKTOP_MAX).map((item, index) => (
        <div
          key={item.key}
          className={
            (index >= MOBILE_MAX ? "hidden sm:block " : "") +
            "overflow-hidden rounded-[2px] sm:px-1 " +
            barClass(item)
          }
          style={
            item.tone === "event" && item.color
              ? { backgroundColor: item.color }
              : undefined
          }
        >
          <span
            className={
              "hidden truncate text-[10px] leading-4 sm:block " +
              (item.tone === "note" ? "text-[rgb(40_30_8)]" : "text-white")
            }
          >
            {item.title}
          </span>
        </div>
      ))}
      {mobileExtra > 0 || desktopExtra > 0 ? (
        <p className="text-[10px] leading-3 text-app-subtle">
          {mobileExtra > 0 ? (
            <span className="sm:hidden">+{mobileExtra}</span>
          ) : null}
          {desktopExtra > 0 ? (
            <span className="hidden sm:inline">+{desktopExtra}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
