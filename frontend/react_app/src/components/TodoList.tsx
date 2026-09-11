import { TodoItem } from "@/components/TodoItem";

export interface TodoRow {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string | null;
  tags?: { id: number; tag_name: string }[];
}

interface TodoListProps {
  todos: TodoRow[];
  loading?: boolean;
}

export function TodoList({ todos, loading }: TodoListProps) {
  if (loading) {
    return <p className="text-sm text-slate-400">Загрузка задач...</p>;
  }

  if (!todos.length) {
    return <p className="text-sm text-slate-400">Задач пока нет.</p>;
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
