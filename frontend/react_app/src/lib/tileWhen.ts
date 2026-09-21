import type { TodoRow } from "@/components/TodoList";
import { parseDateKey } from "@/lib/calendar";
import { formatEventWhen, type EventEntry } from "@/lib/events";
import {
  formatClock,
  formatDateCompact,
  getCalendarDayDiff,
  isOverdue,
  pluralRu,
} from "@/lib/utils";

export type TileWhenMode = "day" | "list";

export type TileWhen = {
  when: string;
  whenSub: string;
  status: string;
  overdue: boolean;
};

function urgencyLabel(
  value: string | Date,
  {
    allowOverdue,
    skipToday,
    done,
    now = new Date(),
  }: {
    allowOverdue: boolean;
    skipToday: boolean;
    done: boolean;
    now?: Date;
  },
): string {
  if (done) return "";
  const diff =
    value instanceof Date
      ? Math.round(
          (new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
          ).getTime() -
            new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
            86_400_000,
        )
      : getCalendarDayDiff(value, now);
  if (diff === null) return "";
  if (diff < 0) {
    if (!allowOverdue) return "";
    const n = Math.abs(diff);
    return `просрочено ${n} ${pluralRu(n, "день", "дня", "дней")}`;
  }
  if (diff === 0) return skipToday ? "" : "сегодня";
  if (diff === 1) return "завтра";
  return `через ${diff} ${pluralRu(diff, "день", "дня", "дней")}`;
}

function todoClock(iso: string | null | undefined): string {
  const clock = formatClock(iso);
  return clock ? `в ${clock}` : "";
}

export function todoTileWhen(todo: TodoRow, mode: TileWhenMode): TileWhen {
  const done = todo.status === "done";
  const overdue = isOverdue(todo.due_date, todo.status);
  const when = todoClock(todo.event_date || todo.due_date);
  const dueDiff = todo.due_date ? getCalendarDayDiff(todo.due_date) : null;
  const whenSub =
    mode === "list" && todo.due_date && dueDiff !== null && dueDiff !== 0
      ? `срок ${formatDateCompact(todo.due_date)}`
      : "";
  const anchor = todo.due_date || todo.event_date || null;
  const status = anchor
    ? urgencyLabel(anchor, {
        allowOverdue: !!todo.due_date,
        skipToday: mode === "day",
        done,
      })
    : "";
  return { when, whenSub, status, overdue };
}

export function eventTileWhen(entry: EventEntry, mode: TileWhenMode): TileWhen {
  const when = formatEventWhen(entry.event);
  const day = parseDateKey(entry.dateKey);
  const status = day
    ? urgencyLabel(day, {
        allowOverdue: false,
        skipToday: mode === "day",
        done: false,
      })
    : "";
  return { when, whenSub: "", status, overdue: false };
}
