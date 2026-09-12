import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusCycleButton, nextStatus } from "@/components/TodoMarks";
import { useToast } from "@/contexts/ToastContext";
import type { TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { TODO_PRIORITIES, getPriorityLabel } from "@/lib/labels";
import { getRecurrenceLabel } from "@/lib/recurrence";
import {
  formatDueCountdown,
  formatDueDateShort,
  formatEventCountdown,
  formatTimeShort,
  getCalendarDayDiff,
  getPriorityBorderClass,
  getPriorityStripeClass,
  isOverdue,
} from "@/lib/utils";

interface TodoItemProps {
  todo: TodoRow;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
}

function OverdueClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function TodoItem({ todo, onUpdated, onDeleted }: TodoItemProps) {
  const { pushToast } = useToast();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showingEvent = !!todo.event_date;
  const overdue =
    !showingEvent && isOverdue(todo.due_date, todo.status);
  const stripe = getPriorityStripeClass(todo.priority);
  const isDone = todo.status === "done";
  const dateIso = todo.event_date || todo.due_date || null;
  const dateLabel = dateIso
    ? showingEvent
      ? formatEventCountdown(dateIso, todo.status)
      : formatDueCountdown(dateIso, todo.status)
    : null;
  const dateShort = dateIso ? formatDueDateShort(dateIso) : null;
  const eventTime = showingEvent && dateIso ? formatTimeShort(dateIso) : null;
  const dateSoon =
    !!dateIso &&
    !isDone &&
    !overdue &&
    getCalendarDayDiff(dateIso) === 0;

  const subTotal = todo.subtasks_summary?.total ?? 0;
  const subDone = todo.subtasks_summary?.done ?? 0;

  const metaParts: string[] = [];
  for (const tag of todo.tags ?? []) {
    metaParts.push(`#${tag.tag_name}`);
  }
  if (subTotal > 0) {
    metaParts.push(`${subDone}/${subTotal} подзадач`);
  }
  if (todo.recurrence && todo.recurrence !== "never") {
    metaParts.push(getRecurrenceLabel(todo.recurrence).toLowerCase());
  }

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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
      pushToast("Не удалось обновить задачу", "error");
    } finally {
      setBusy(false);
    }
  }

  function cycleStatus() {
    void patchFields({ status: nextStatus(todo.status) });
  }

  function setPriority(priority: string) {
    setMenuOpen(false);
    if (priority === todo.priority) return;
    void patchFields({ priority });
  }

  async function handleDeleteConfirm() {
    const snapshot = {
      title: todo.title,
      description: todo.description ?? "",
      status: todo.status,
      priority: todo.priority,
      due_date: todo.due_date ?? null,
      event_date: todo.event_date ?? null,
      recurrence: todo.recurrence ?? "never",
      tag_ids: todo.tags?.map((t) => t.id) ?? [],
    };

    try {
      setBusy(true);
      const res = await apiFetch(`/todos/${todo.id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setConfirmOpen(false);
      onDeleted(todo.id);
      pushToast("Задача удалена", {
        variant: "info",
        action: {
          label: "Отменить",
          onClick: () => {
            void (async () => {
              try {
                const createRes = await apiFetch("/todos/", {
                  method: "POST",
                  body: JSON.stringify({
                    title: snapshot.title,
                    description: snapshot.description,
                    status: snapshot.status,
                    priority: snapshot.priority,
                    due_date: snapshot.due_date,
                    event_date: snapshot.event_date,
                    recurrence: snapshot.recurrence,
                    tag_ids: snapshot.tag_ids,
                  }),
                });
                if (!createRes.ok) throw new Error("restore failed");
                const restored = (await createRes.json()) as TodoRow;
                onUpdated(restored);
                pushToast(
                  "Задача восстановлена (новая копия, без подзадач)",
                  "success",
                );
              } catch (e) {
                console.error(e);
                pushToast("Не удалось восстановить задачу", "error");
              }
            })();
          },
        },
      });
    } catch (e) {
      console.error(e);
      pushToast("Не удалось удалить задачу", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <li
        className={
          "group relative flex rounded-lg border bg-app-surface transition-colors hover:bg-app-surface-muted " +
          getPriorityBorderClass(todo.priority) +
          " " +
          (overdue ? "todo-tile-overdue " : "") +
          (busy ? "opacity-80 " : "") +
          (menuOpen ? "z-20" : "")
        }
      >
        <div
          className={"w-1 shrink-0 self-stretch rounded-l-lg " + stripe}
          title={`Приоритет: ${getPriorityLabel(todo.priority)}`}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 sm:gap-2.5 sm:px-3 sm:py-2">
          <StatusCycleButton
            status={todo.status}
            disabled={busy}
            onClick={cycleStatus}
            className="mt-0.5"
          />

          <div className="min-w-0 flex-1 pt-px">
            <Link
              to={`/todos/${todo.id}`}
              title={todo.title}
              className={
                "block truncate text-[15px] font-medium leading-snug hover:text-app-accent " +
                (isDone ? "text-app-subtle line-through" : "text-app")
              }
            >
              {todo.title}
            </Link>
            {metaParts.length > 0 && (
              <p className="mt-0.5 truncate text-[12px] leading-relaxed text-app-subtle">
                {metaParts.join(" · ")}
              </p>
            )}
          </div>

          {dateLabel && dateIso && (
            <div
              title={new Date(dateIso).toLocaleString()}
              className={
                "flex w-28 shrink-0 flex-col items-end pt-0.5 text-right leading-tight " +
                (overdue
                  ? "font-medium text-[var(--app-danger)]"
                  : dateSoon
                    ? "font-medium text-app"
                    : "text-app-subtle")
              }
            >
              <span className="inline-flex items-center justify-end gap-1 text-xs">
                {overdue && <OverdueClockIcon />}
                {dateLabel}
              </span>
              {dateShort &&
                dateShort.toLowerCase() !== dateLabel.toLowerCase() && (
                  <span className="text-[11px] font-normal text-app-subtle">
                    {dateShort}
                  </span>
                )}
              {eventTime && (
                <span className="text-[11px] font-normal text-app-subtle">
                  {eventTime}
                </span>
              )}
            </div>
          )}

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-md p-1.5 text-app-subtle opacity-70 hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 disabled:opacity-40"
              aria-label="Действия с задачей"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              <MoreIcon />
            </button>

            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                aria-label="Действия с задачей"
                className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-app bg-app-modal py-1 shadow-app"
              >
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-app-subtle">
                  Приоритет
                </p>
                {TODO_PRIORITIES.map((priority) => {
                  const selected = priority === todo.priority;
                  return (
                    <button
                      key={priority}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => setPriority(priority)}
                      className={
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-app-surface-muted " +
                        (selected ? "text-app" : "text-app-muted")
                      }
                    >
                      <span className="flex-1">{getPriorityLabel(priority)}</span>
                      {selected && (
                        <span className="text-app-accent" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="my-1 border-t border-app" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)]"
                >
                  Удалить
                </button>
              </div>
            )}
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
