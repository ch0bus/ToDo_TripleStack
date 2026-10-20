import type { TodoRow } from "@/components/TodoList";
import { dueDateKey } from "@/lib/calendar";
import { getCalendarDayDiff, isOverdue as isDuePast } from "@/lib/utils";

export function isOverdue(todo: TodoRow, now = new Date()): boolean {
  return isDuePast(todo.due_date, todo.status, now);
}

export function isDueOnDay(todo: TodoRow, day: Date): boolean {
  if (!todo.due_date) return false;
  return getCalendarDayDiff(todo.due_date, day) === 0;
}

export function isEventOnDay(todo: TodoRow, day: Date): boolean {
  if (!todo.event_date) return false;
  return getCalendarDayDiff(todo.event_date, day) === 0;
}

export function isDueToday(todo: TodoRow, now = new Date()): boolean {
  return isDueOnDay(todo, now);
}

export function isEventToday(todo: TodoRow, now = new Date()): boolean {
  return isEventOnDay(todo, now);
}

export function inboxTodosForDay(todos: TodoRow[], day: Date): TodoRow[] {
  return todos.filter(
    (todo) => isDueOnDay(todo, day) || isEventOnDay(todo, day),
  );
}

export type InboxScope = "week" | "all";

export function parseInboxScope(value: string | null | undefined): InboxScope {
  return value === "all" ? "all" : "week";
}

export function todoInDateRange(
  todo: TodoRow,
  rangeFrom: string,
  rangeTo: string,
): boolean {
  for (const iso of [todo.due_date, todo.event_date]) {
    if (!iso) continue;
    const key = dueDateKey(iso);
    if (key && key >= rangeFrom && key <= rangeTo) return true;
  }
  return false;
}

export function inboxBusyDayKeys(
  todos: TodoRow[],
  rangeFrom: string,
  rangeTo: string,
): Set<string> {
  const keys = new Set<string>();
  for (const todo of todos) {
    for (const iso of [todo.due_date, todo.event_date]) {
      if (!iso) continue;
      const key = dueDateKey(iso);
      if (key && key >= rangeFrom && key <= rangeTo) keys.add(key);
    }
  }
  return keys;
}

/** День (включая done) забирает свои строки; просрочено — только открытые не из дня. */
export function groupInboxTodos(
  todos: TodoRow[],
  selectedDay: Date,
  now = new Date(),
) {
  const today: TodoRow[] = [];
  const overdue: TodoRow[] = [];
  const rest: TodoRow[] = [];

  for (const todo of todos) {
    if (isDueOnDay(todo, selectedDay) || isEventOnDay(todo, selectedDay)) {
      today.push(todo);
      continue;
    }
    if (todo.status !== "done" && isOverdue(todo, now)) {
      overdue.push(todo);
      continue;
    }
    rest.push(todo);
  }

  return { today, overdue, rest };
}

export function hasActiveFilters(params: {
  priority?: string;
  tag?: string;
}): boolean {
  return Boolean(params.priority || params.tag);
}

export function isCompletedLate(todo: TodoRow): boolean {
  if (todo.status !== "done" || !todo.due_date || !todo.completed_at) {
    return false;
  }
  return new Date(todo.completed_at).getTime() > new Date(todo.due_date).getTime();
}

export function todoCompletedInRange(
  todo: TodoRow,
  rangeFrom?: string | null,
  rangeTo?: string | null,
): boolean {
  if (todo.status !== "done") return false;
  if (!rangeFrom || !rangeTo) return true;
  const key = dueDateKey(todo.completed_at);
  if (!key) return false;
  return key >= rangeFrom && key <= rangeTo;
}
