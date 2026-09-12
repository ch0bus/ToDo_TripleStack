export const TODO_STATUSES = ["todo", "in_progress", "done"] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  critical: "Критический",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as TodoStatus] ?? status;
}

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as TodoPriority] ?? priority;
}

export const STATUS_SELECT_OPTIONS = TODO_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export const PRIORITY_SELECT_OPTIONS = TODO_PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));
