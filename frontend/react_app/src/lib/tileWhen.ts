import type { TodoRow } from "@/components/TodoList";
import { parseDateKey } from "@/lib/calendar";
import {
  formatEventWhen,
  isEventOccurrenceAttended,
  isEventOccurrenceMissed,
  type EventEntry,
} from "@/lib/events";
import {
  formatClock,
  formatDateCompact,
  getCalendarDayDiff,
  isOverdue,
  pluralRu,
} from "@/lib/utils";

export type TileWhenMode = "day" | "list" | "archive";

export type TileWhen = {
  when: string;
  whenSub: string;
  status: string;
  statusShort: string;
  overdue: boolean;
};

function urgencyLabel(
  value: string | Date,
  {
    allowOverdue,
    skipToday,
    done,
    now = new Date(),
    overdueWord = "просрочено",
  }: {
    allowOverdue: boolean;
    skipToday: boolean;
    done: boolean;
    now?: Date;
    overdueWord?: "просрочено" | "пропущено";
  },
): { full: string; short: string } {
  if (done) return { full: "", short: "" };
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
  if (diff === null) return { full: "", short: "" };
  if (diff < 0) {
    if (!allowOverdue) return { full: "", short: "" };
    const n = Math.abs(diff);
    return {
      full: `${overdueWord} ${n} ${pluralRu(n, "день", "дня", "дней")}`,
      short: `${overdueWord} ${n} дн.`,
    };
  }
  if (diff === 0) {
    if (allowOverdue && overdueWord === "пропущено") {
      return { full: "пропущено", short: "пропущено" };
    }
    const text = skipToday ? "" : "сегодня";
    return { full: text, short: text };
  }
  if (diff === 1) return { full: "завтра", short: "завтра" };
  return {
    full: `через ${diff} ${pluralRu(diff, "день", "дня", "дней")}`,
    short: `через ${diff} дн.`,
  };
}

function todoClock(iso: string | null | undefined): string {
  const clock = formatClock(iso);
  return clock ? `в ${clock}` : "";
}

function closedVsDue(todo: TodoRow): { lateDays: number | null; overdue: boolean } {
  if (!todo.due_date || !todo.completed_at) {
    return { lateDays: null, overdue: false };
  }
  const completed = new Date(todo.completed_at);
  if (Number.isNaN(completed.getTime())) {
    return { lateDays: null, overdue: false };
  }
  const diff = getCalendarDayDiff(todo.due_date, completed);
  if (diff === null) return { lateDays: null, overdue: false };
  return { lateDays: -diff, overdue: diff < 0 };
}

export function todoArchiveLifetime(todo: TodoRow): string {
  if (!todo.created_at || !todo.completed_at) return "";
  const created = new Date(todo.created_at);
  if (Number.isNaN(created.getTime())) return "";
  const days = getCalendarDayDiff(todo.completed_at, created);
  if (days === null) return "";
  if (days <= 0) return "в день создания";
  return `${days} ${pluralRu(days, "день", "дня", "дней")} с создания`;
}

export function todoTileWhen(todo: TodoRow, mode: TileWhenMode): TileWhen {
  if (mode === "archive") {
    const closed = todo.completed_at
      ? `закрыто ${formatDateCompact(todo.completed_at)}${todoClock(todo.completed_at) ? ` ${todoClock(todo.completed_at)}` : ""}`
      : "";
    const due = todo.due_date ? `срок ${formatDateCompact(todo.due_date)}` : "";
    const { lateDays, overdue } = closedVsDue(todo);
    const vsDue =
      lateDays === null
        ? ""
        : lateDays === 0
          ? "вовремя"
          : lateDays > 0
            ? `+${lateDays} дн.`
            : `−${Math.abs(lateDays)} дн.`;
    return {
      when: closed,
      whenSub: due,
      status: vsDue,
      statusShort: vsDue,
      overdue,
    };
  }

  const done = todo.status === "done";
  const overdue = isOverdue(todo.due_date, todo.status);
  const when = todoClock(todo.event_date || todo.due_date);
  const dueDiff = todo.due_date ? getCalendarDayDiff(todo.due_date) : null;
  const whenSub =
    mode === "list" && todo.due_date && dueDiff !== null && dueDiff !== 0
      ? `срок ${formatDateCompact(todo.due_date)}`
      : "";
  const anchor = todo.due_date || todo.event_date || null;
  const urgency = anchor
    ? urgencyLabel(anchor, {
        allowOverdue: !!todo.due_date,
        skipToday: mode === "day",
        done,
      })
    : { full: "", short: "" };
  return {
    when,
    whenSub,
    status: urgency.full,
    statusShort: urgency.short,
    overdue,
  };
}

export function eventTileWhen(entry: EventEntry, mode: TileWhenMode): TileWhen {
  const when = formatEventWhen(entry.event);
  const day = parseDateKey(entry.occurrenceStartKey) ?? parseDateKey(entry.dateKey);
  const attended =
    entry.attended ||
    isEventOccurrenceAttended(entry.event, entry.occurrenceStartKey);
  const missed = isEventOccurrenceMissed(entry.event, entry.occurrenceStartKey);
  const whenSub =
    mode === "list" && day ? formatDateCompact(day) : "";
  const urgency = day
    ? urgencyLabel(day, {
        allowOverdue: missed,
        skipToday: mode === "day" && !missed,
        done: attended,
        overdueWord: missed ? "пропущено" : "просрочено",
      })
    : { full: "", short: "" };
  return {
    when,
    whenSub,
    status: urgency.full,
    statusShort: urgency.short,
    overdue: missed,
  };
}
