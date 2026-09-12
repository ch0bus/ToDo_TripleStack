import type { TodoRow } from "@/components/TodoList";
import { getCalendarDayDiff, isOverdue as isDuePast } from "@/lib/utils";

export function isOverdue(todo: TodoRow, now = new Date()): boolean {
  return isDuePast(todo.due_date, todo.status, now);
}

export function isDueToday(todo: TodoRow, now = new Date()): boolean {
  if (!todo.due_date) return false;
  return getCalendarDayDiff(todo.due_date, now) === 0;
}

export function isEventToday(todo: TodoRow, now = new Date()): boolean {
  if (!todo.event_date) return false;
  return getCalendarDayDiff(todo.event_date, now) === 0;
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
