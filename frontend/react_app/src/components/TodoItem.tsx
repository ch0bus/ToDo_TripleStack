import { useEffect, useId, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EntityTile, MoreIcon } from "@/components/EntityTile";
import { StatusCycleButton, nextStatus } from "@/components/TodoMarks";
import { useToast } from "@/contexts/ToastContext";
import type { TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { TODO_PRIORITIES, getPriorityLabel } from "@/lib/labels";
import { getRecurrenceFact } from "@/lib/recurrence";
import { todoTileWhen, type TileWhenMode } from "@/lib/tileWhen";
import { getPriorityBorderClass, getPriorityStripeClass } from "@/lib/utils";

interface TodoItemProps {
  todo: TodoRow;
  onUpdated: (todo: TodoRow) => void;
  onDeleted: (id: number) => void;
  whenMode?: TileWhenMode;
}

export function TodoItem({
  todo,
  onUpdated,
  onDeleted,
  whenMode = "list",
}: TodoItemProps) {
  const { pushToast } = useToast();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { when, whenSub, status, statusShort, overdue } = todoTileWhen(todo, whenMode);
  const isDone = todo.status === "done";
  const subTotal = todo.subtasks_summary?.total ?? 0;
  const subDone = todo.subtasks_summary?.done ?? 0;
  const facts = [
    subTotal > 0 ? `${subDone}/${subTotal}` : "",
    getRecurrenceFact(todo.recurrence),
  ]
    .filter(Boolean)
    .join(" · ");
  const tags = (todo.tags ?? []).map((tag) => tag.tag_name);

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
      <EntityTile
        className={
          getPriorityBorderClass(todo.priority) +
          (busy ? " opacity-80" : "") +
          (menuOpen ? " z-20" : "")
        }
        stripeClassName={getPriorityStripeClass(todo.priority)}
        overdue={overdue}
        mark={
          <StatusCycleButton
            status={todo.status}
            disabled={busy}
            onClick={cycleStatus}
            iconClassName="h-4 w-4"
          />
        }
        title={todo.title}
        titleTo={`/todos/${todo.id}`}
        done={isDone}
        when={when}
        whenSub={whenSub}
        status={status}
        statusShort={statusShort}
        facts={facts}
        tags={tags}
        menu={
          <div ref={menuRef} className="relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-md p-0.5 text-app-subtle opacity-70 hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 disabled:opacity-40"
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
        }
      />
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
