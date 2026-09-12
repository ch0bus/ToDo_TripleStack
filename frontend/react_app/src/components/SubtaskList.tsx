import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiFetch } from "@/lib/api";
import { btnSecondary, inputClass } from "@/lib/uiClasses";

interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

export interface SubtasksSummary {
  done: number;
  total: number;
}

function summaryFromItems(items: Subtask[]): SubtasksSummary {
  return {
    total: items.length,
    done: items.filter((s) => s.completed).length,
  };
}

interface SubtaskListProps {
  todoId: number;
  embedded?: boolean;
  onSummaryChange?: (summary: SubtasksSummary) => void;
}

export function SubtaskList({
  todoId,
  embedded,
  onSummaryChange,
}: SubtaskListProps) {
  const [items, setItems] = useState<Subtask[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Subtask | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const onSummaryChangeRef = useRef(onSummaryChange);
  onSummaryChangeRef.current = onSummaryChange;

  const lastSummaryRef = useRef<string>("");

  function notifySummary(list: Subtask[]) {
    const summary = summaryFromItems(list);
    const key = `${summary.done}:${summary.total}`;
    if (key === lastSummaryRef.current) return;
    lastSummaryRef.current = key;
    onSummaryChangeRef.current?.(summary);
  }

  useEffect(() => {
    lastSummaryRef.current = "";
    let cancelled = false;
    const base = `/todos/${todoId}/subtasks/`;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch(base);
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as Subtask[];
        if (cancelled) return;
        setItems(data);
        notifySummary(data);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError("Не удалось загрузить подзадачи");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [todoId]);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    const base = `/todos/${todoId}/subtasks/`;
    try {
      const res = await apiFetch(base, {
        method: "POST",
        body: JSON.stringify({ title: trimmed, completed: false }),
      });
      if (!res.ok) throw new Error("create failed");
      const created = (await res.json()) as Subtask;
      setItems((prev) => {
        const next = [created, ...prev];
        notifySummary(next);
        return next;
      });
      setTitle("");
    } catch (e) {
      console.error(e);
      setError("Не удалось добавить подзадачу");
    }
  }

  async function toggle(subtask: Subtask) {
    const base = `/todos/${todoId}/subtasks/`;
    try {
      const res = await apiFetch(`${base}${subtask.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !subtask.completed }),
      });
      if (!res.ok) throw new Error("patch failed");
      const updated = (await res.json()) as Subtask;
      setItems((prev) => {
        const next = prev.map((s) => (s.id === updated.id ? updated : s));
        notifySummary(next);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function confirmRemove() {
    if (!deleteTarget) return;
    const base = `/todos/${todoId}/subtasks/`;
    try {
      setDeleteBusy(true);
      const res = await apiFetch(`${base}${deleteTarget.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setItems((prev) => {
        const next = prev.filter((s) => s.id !== deleteTarget.id);
        notifySummary(next);
        return next;
      });
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteBusy(false);
    }
  }

  const summary = summaryFromItems(items);
  const pct =
    summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;

  const sectionClass = embedded
    ? "border-t border-app px-4 py-4 sm:px-5 sm:py-5"
    : "mt-8 p-4 rounded-xl border border-app bg-app-surface shadow-app";

  return (
    <>
      <section className={sectionClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
            Подзадачи
          </h2>
          {!loading && summary.total > 0 && (
            <div className="flex items-center gap-2 text-xs text-app-muted">
              <span
                className="inline-flex h-1.5 w-12 overflow-hidden rounded-full bg-app-border"
                aria-hidden
              >
                <span
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </span>
              {summary.done}/{summary.total}
            </div>
          )}
        </div>

        {error && <p className="mb-2 text-xs text-red-300">{error}</p>}

        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.stopPropagation();
              void handleAdd();
            }}
            placeholder="Новая подзадача..."
            className={inputClass + " min-w-0 flex-1 py-1.5 text-sm"}
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            className={btnSecondary + " shrink-0 py-1.5"}
          >
            Добавить
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-app-muted">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-app-subtle">
            Разбейте задачу на шаги — они появятся здесь.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-app bg-app-surface-muted px-2.5 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={s.completed}
                  onChange={() => toggle(s)}
                  className="h-4 w-4 shrink-0 rounded border-slate-600"
                  aria-label={
                    s.completed
                      ? `Снять отметку: ${s.title}`
                      : `Выполнено: ${s.title}`
                  }
                />
                <span
                  className={
                    s.completed
                      ? "min-w-0 flex-1 text-app-subtle line-through"
                      : "min-w-0 flex-1 text-app"
                  }
                >
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(s)}
                  className="shrink-0 text-xs text-red-400/90 hover:text-red-300"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Удалить подзадачу?"
        message={
          deleteTarget ? `«${deleteTarget.title}» будет удалена.` : ""
        }
        confirmLabel="Удалить"
        loading={deleteBusy}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
