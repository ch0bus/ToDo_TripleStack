import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SubtaskList, type SubtasksSummary } from "@/components/SubtaskList";
import { TodoEditForm, type TodoEditData } from "@/components/TodoEditForm";
import { apiFetch } from "@/lib/api";
import type { TagOption } from "@/lib/tags";
import { getPriorityStripeClass, isOverdue } from "@/lib/utils";

function DetailSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30">
      <div className="flex animate-pulse">
        <div className="w-1 shrink-0 bg-slate-700" />
        <div className="flex-1 space-y-4 p-5">
          <div className="h-4 w-24 rounded bg-slate-700" />
          <div className="h-8 w-3/4 rounded bg-slate-700" />
          <div className="h-20 rounded-lg bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

export function TodoDetailPage() {
  const { todoId } = useParams();
  const id = Number(todoId);

  const [todo, setTodo] = useState<TodoEditData | null>(null);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Некорректный ID задачи");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");
        const [todoRes, tagsRes] = await Promise.all([
          apiFetch(`/todos/${id}/`),
          apiFetch("/tags/"),
        ]);
        if (!todoRes.ok) throw new Error("Failed to load todo");
        setTodo((await todoRes.json()) as TodoEditData);
        if (tagsRes.ok) {
          setTags((await tagsRes.json()) as TagOption[]);
        }
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить задачу");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const handleSubtaskSummaryChange = useCallback(
    (subtasks_summary: SubtasksSummary) => {
      setTodo((prev) => {
        if (!prev) return prev;
        if (
          prev.subtasks_summary?.done === subtasks_summary.done &&
          prev.subtasks_summary?.total === subtasks_summary.total
        ) {
          return prev;
        }
        return { ...prev, subtasks_summary };
      });
    },
    [],
  );

  const stripe =
    todo &&
    getPriorityStripeClass(
      todo.priority,
      isOverdue(todo.due_date, todo.status),
    );

  return (
    <div className="mx-auto max-w-2xl px-3 pb-8 pt-4 sm:px-4 sm:pt-6">
      <nav className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-blue-400"
        >
          <span aria-hidden>←</span>
          Входящие
        </Link>
      </nav>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading || !todo ? (
        !error && <DetailSkeleton />
      ) : (
        <article
          className={
            "overflow-hidden rounded-xl border shadow-sm " +
            (isOverdue(todo.due_date, todo.status)
              ? "border-red-900/40 bg-slate-800/50"
              : "border-slate-700/50 bg-slate-800/40")
          }
        >
          <div className="flex">
            <div
              className={"w-1 shrink-0 self-stretch " + stripe}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <TodoEditForm todo={todo} tags={tags} onSaved={setTodo}>
                <SubtaskList
                  embedded
                  todoId={todo.id}
                  onSummaryChange={handleSubtaskSummaryChange}
                />
              </TodoEditForm>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
