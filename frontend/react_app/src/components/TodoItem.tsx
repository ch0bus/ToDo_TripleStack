import { useState } from "react";
import { Link } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MetaChip } from "@/components/MetaChip";
import {
  PrioritySelect,
  StatusSelect,
} from "@/components/StatusPrioritySelects";
import type { TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { getPriorityLabel } from "@/lib/labels";
import { getRecurrenceLabel } from "@/lib/recurrence";
import {
  formatDueLabel,
  getPriorityDotClass,
  getPriorityStripeClass,
  isOverdue,
} from "@/lib/utils";

interface TodoItemProps {
  todo: TodoRow;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function TodoItem({ todo, onUpdated, onDeleted }: TodoItemProps) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const overdue = isOverdue(todo.due_date, todo.status);
  const stripe = getPriorityStripeClass(todo.priority, overdue);
  const isDone = todo.status === "done";

  const subTotal = todo.subtasks_summary?.total ?? 0;
  const subDone = todo.subtasks_summary?.done ?? 0;
  const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;

  async function patchFields(body: Record<string, string>) {
    try {
      setBusy(true);
      const res = await apiFetch(`/todos/${todo.id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("patch failed");
      onUpdated((await res.json()) as TodoRow);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function patchStatus(status: string) {
    if (status === todo.status) return;
    void patchFields({ status });
  }

  function patchPriority(priority: string) {
    if (priority === todo.priority) return;
    void patchFields({ priority });
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

  const hasMeta =
    !!todo.due_date ||
    (todo.tags && todo.tags.length > 0) ||
    (todo.recurrence && todo.recurrence !== "never") ||
    subTotal > 0;

  return (
    <>
      <li
        className={
          "group relative flex overflow-hidden rounded-xl border shadow-sm transition-colors " +
          (overdue
            ? "border-red-900/40 bg-slate-800/50 hover:bg-slate-800/70"
            : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/80 hover:bg-slate-800/65") +
          (busy ? " opacity-80" : "")
        }
      >
        <div
          className={"w-1 shrink-0 self-stretch " + stripe}
          aria-hidden
        />

        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  <span
                    className={
                      "h-2 w-2 shrink-0 rounded-full " +
                      getPriorityDotClass(todo.priority)
                    }
                    aria-hidden
                  />
                  {getPriorityLabel(todo.priority)}
                </span>
                {overdue && (
                  <MetaChip tone="danger">Просрочено</MetaChip>
                )}
              </div>

              <Link
                to={`/todos/${todo.id}`}
                className={
                  "block text-[15px] font-semibold leading-snug hover:text-blue-300 sm:text-base " +
                  (isDone
                    ? "text-slate-500 line-through decoration-slate-600"
                    : "text-slate-50")
                }
              >
                {todo.title}
              </Link>

              {todo.description && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
                  {todo.description}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
              className="shrink-0 rounded-lg p-2 text-slate-500 opacity-60 transition-opacity hover:bg-red-950/50 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
              aria-label="Удалить задачу"
            >
              <TrashIcon />
            </button>
          </div>

          {hasMeta && (
            <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-1.5">
              {todo.due_date && (
                <MetaChip tone={overdue ? "danger" : "default"}>
                  Срок: {formatDueLabel(todo.due_date)}
                </MetaChip>
              )}
              {todo.tags?.map((t) => (
                <MetaChip key={t.id}>#{t.tag_name}</MetaChip>
              ))}
              {todo.recurrence && todo.recurrence !== "never" && (
                <MetaChip tone="accent">
                  <span className="text-slate-500" aria-hidden>
                    ↻
                  </span>
                  {getRecurrenceLabel(todo.recurrence)}
                </MetaChip>
              )}
              {subTotal > 0 && (
                <MetaChip>
                  <span
                    className="inline-flex h-1 w-7 overflow-hidden rounded-full bg-slate-700"
                    aria-hidden
                  >
                    <span
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${subPct}%` }}
                    />
                  </span>
                  {subDone}/{subTotal} подзадач
                </MetaChip>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-slate-700/40 pt-2 sm:mt-3 sm:flex-wrap sm:gap-x-3 sm:gap-y-2 sm:overflow-visible sm:pt-3">
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:inline">
                Статус
              </span>
              <StatusSelect
                value={todo.status}
                disabled={busy}
                inline
                onChange={patchStatus}
              />
            </div>
            <div className="hidden h-3 w-px shrink-0 bg-slate-700 sm:block" aria-hidden />
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:inline">
                Приоритет
              </span>
              <PrioritySelect
                value={todo.priority}
                disabled={busy}
                inline
                onChange={patchPriority}
              />
            </div>
            <Link
              to={`/todos/${todo.id}`}
              className="ml-auto hidden shrink-0 text-xs text-slate-500 hover:text-blue-400 hover:underline sm:inline"
            >
              Подробнее →
            </Link>
          </div>
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
