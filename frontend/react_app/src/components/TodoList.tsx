import { TodoItem } from "@/components/TodoItem";

export interface TodoRow {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string | null;
  tags?: { id: number; tag_name: string }[];
  subtasks_summary?: { done: number; total: number };
}

interface TodoListProps {
  todos: TodoRow[];
  loading?: boolean;
  emptyMessage?: string;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
}

export function TodoList({
  todos,
  loading,
  emptyMessage,
  onUpdated,
  onDeleted,
}: TodoListProps) {
  if (loading) {
    return <p className="text-sm text-slate-400">Загрузка задач...</p>;
  }

  if (!todos.length) {
    return (
      <div className="rounded-lg bg-slate-800/60 p-12 text-center">
        <p className="text-lg text-slate-400">
          {emptyMessage ?? "Задач пока нет."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ))}
    </ul>
  );
}
