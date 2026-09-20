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
    (todo) =>
      todo.status !== "done" &&
      (isDueOnDay(todo, day) || isEventOnDay(todo, day)),
  );
}

export function inboxBusyDayKeys(
  todos: TodoRow[],
  rangeFrom: string,
  rangeTo: string,
): Set<string> {
  const keys = new Set<string>();
  for (const todo of todos) {
    if (todo.status === "done") continue;
    for (const iso of [todo.due_date, todo.event_date]) {
      if (!iso) continue;
      const key = dueDateKey(iso);
      if (key && key >= rangeFrom && key <= rangeTo) keys.add(key);
    }
  }
  return keys;
}

export function groupInboxTodos(todos: TodoRow[], now = new Date()) {
  const today: TodoRow[] = [];
  const overdue: TodoRow[] = [];
  const rest: TodoRow[] = [];
  const done: TodoRow[] = [];

  for (const todo of todos) {
    if (todo.status === "done") {
      done.push(todo);
      continue;
    }
    if (isDueToday(todo, now) || isEventToday(todo, now)) today.push(todo);
    else if (isOverdue(todo, now)) overdue.push(todo);
    else rest.push(todo);
  }

  return { today, overdue, rest, done };
}

export function hasActiveFilters(params: {
  status?: string;
  priority?: string;
  tag?: string;
  search?: string;
}): boolean {
  return Boolean(params.status || params.priority || params.tag || params.search);
}
