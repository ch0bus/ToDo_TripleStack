import type { TodoRow } from "@/components/TodoList";

export const TODO_SORTS = ["new", "created", "due", "priority"] as const;
export type TodoSort = (typeof TODO_SORTS)[number];

export const TODO_SORT_OPTIONS: { value: TodoSort; label: string }[] = [
  { value: "new", label: "Новые сверху" },
  { value: "created", label: "Старые сверху" },
  { value: "due", label: "По сроку" },
  { value: "priority", label: "По приоритету" },
];

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function parseTodoSort(
  value: string | null | undefined,
  fallback: TodoSort,
): TodoSort {
  if (value && (TODO_SORTS as readonly string[]).includes(value)) {
    return value as TodoSort;
  }
  return fallback;
}

function createdTime(todo: TodoRow): number {
  return todo.created_at ? new Date(todo.created_at).getTime() : 0;
}

function dueTime(todo: TodoRow): number | null {
  if (!todo.due_date) return null;
  const time = new Date(todo.due_date).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareCreatedDesc(a: TodoRow, b: TodoRow): number {
  return createdTime(b) - createdTime(a) || a.id - b.id;
}

export function sortTodos(todos: TodoRow[], sort: TodoSort): TodoRow[] {
  return [...todos].sort((a, b) => {
    if (sort === "created") {
      return createdTime(a) - createdTime(b) || a.id - b.id;
    }
    if (sort === "due") {
      const aDue = dueTime(a);
      const bDue = dueTime(b);
      if (aDue === null && bDue === null) return compareCreatedDesc(a, b);
      if (aDue === null) return 1;
      if (bDue === null) return -1;
      return aDue - bDue || compareCreatedDesc(a, b);
    }
    if (sort === "priority") {
      const aRank = PRIORITY_RANK[a.priority] ?? 4;
      const bRank = PRIORITY_RANK[b.priority] ?? 4;
      return aRank - bRank || compareCreatedDesc(a, b);
    }
    return compareCreatedDesc(a, b);
  });
}
