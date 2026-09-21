import type { ReactNode } from "react";

import { TodoItem } from "@/components/TodoItem";
import { cardClass } from "@/lib/uiClasses";
import type { TileWhenMode } from "@/lib/tileWhen";

export interface TodoRow {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string | null;
  event_date?: string | null;
  tags?: { id: number; tag_name: string }[];
  subtasks_summary?: { done: number; total: number };
  recurrence?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface TodoListProps {
  todos: TodoRow[];
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
  whenMode?: TileWhenMode;
}

export function TodoList({
  todos,
  loading,
  emptyMessage,
  emptyAction,
  onUpdated,
  onDeleted,
  whenMode = "list",
}: TodoListProps) {
  if (loading) {
    return <p className="text-sm text-app-muted">Загрузка задач...</p>;
  }

  if (!todos.length) {
    return (
      <div className={"p-12 text-center " + cardClass}>
        <p className="text-lg text-app-muted">
          {emptyMessage ?? "Задач пока нет."}
        </p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          whenMode={whenMode}
        />
      ))}
    </ul>
  );
}
