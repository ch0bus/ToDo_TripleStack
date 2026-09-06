"use client";

import Link from "next/link";

import { getPriorityColor, formatDateTime } from "@/lib/utils";

interface TodoItemProps {
  todo: {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date?: string | null;
    tags?: { id: number; tag_name: string }[];
  };
}

export function TodoItem({ todo }: TodoItemProps) {
  const priorityCls = getPriorityColor(todo.priority);

  return (
    <li className="flex items-start justify-between rounded-md bg-slate-800 px-3 py-2">
      <div className="flex-1 pr-3">
        <Link href={`/todos/${todo.id}`} className="block">
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                priorityCls
              }
            >
              {todo.priority}
            </span>
            <span className="text-sm font-medium">{todo.title}</span>
          </div>

          {todo.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
              {todo.description}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            {todo.due_date && (
              <span>до {formatDateTime(todo.due_date)}</span>
            )}

            {todo.tags && todo.tags.length > 0 && (
              <span>
                {todo.tags.map((t) => `#${t.tag_name}`).join(" ")}
              </span>
            )}

            <span>{todo.status}</span>
          </div>
        </Link>
      </div>
    </li>
  );
}
