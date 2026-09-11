import { useState } from "react";
import { Link } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import {
  formatDueLabel,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/utils";

interface TodoItemProps {
  todo: TodoRow;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
}

export function TodoItem({ todo, onUpdated, onDeleted }: TodoItemProps) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const priorityCls = getPriorityColor(todo.priority);
  const isDone = todo.status === "done";

  async function toggleDone() {
    const nextStatus = isDone ? "todo" : "done";
    try {
      setBusy(true);
      const res = await apiFetch(`/todos/${todo.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("patch failed");
      onUpdated((await res.json()) as TodoRow);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    try {
      setBusy(true);
      const res = await apiFetch(`/todos/${todo.id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setConfirmOpen(false);
      onDeleted(todo.id);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <li className="rounded-lg border border-slate-800 bg-slate-800/80 p-4 shadow-sm">
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={isDone}
          disabled={busy}
          onChange={toggleDone}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600"
          aria-label={isDone ? "Отметить невыполненной" : "Отметить выполненной"}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                priorityCls
              }
            >
              {getPriorityLabel(todo.priority)}
            </span>
            <Link
              to={`/todos/${todo.id}`}
              className="text-sm font-medium text-slate-50 hover:underline"
            >
              {todo.title}
            </Link>
          </div>

          {todo.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
              {todo.description}
            </p>
          )}

          <div className="mt-2 space-y-1 text-xs text-slate-400">
            {todo.due_date && (
              <p>
                <span className="text-slate-500">Due: </span>
                {formatDueLabel(todo.due_date)}
              </p>
            )}
            {todo.tags && todo.tags.length > 0 && (
              <p>
                <span className="text-slate-500">Tags: </span>
                {todo.tags.map((t) => `#${t.tag_name}`).join(" ")}
              </p>
            )}
            <p className="text-slate-300">{getStatusLabel(todo.status)}</p>
            {todo.subtasks_summary && todo.subtasks_summary.total > 0 && (
              <p>
                Подзадачи: {todo.subtasks_summary.done}/
                {todo.subtasks_summary.total} выполнено
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 self-start text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          🗑️ Delete
        </button>
      </div>
    </li>

    <ConfirmDialog
      open={confirmOpen}
      title="Удалить задачу?"
      message={`«${todo.title}» будет удалена без возможности восстановления.`}
      confirmLabel="Удалить"
      loading={busy}
      onConfirm={handleDeleteConfirm}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
