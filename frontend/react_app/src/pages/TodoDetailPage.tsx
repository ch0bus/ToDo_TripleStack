import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SubtaskList, type SubtasksSummary } from "@/components/SubtaskList";
import { TodoEditForm, type TodoEditData } from "@/components/TodoEditForm";
import { apiFetch } from "@/lib/api";
import type { TagOption } from "@/lib/tags";

function DetailSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
      <div className="flex animate-pulse">
        <div className="w-1 shrink-0 bg-app-border" />
        <div className="grid min-w-0 flex-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-app-border" />
              <div className="h-7 flex-1 rounded bg-app-border" />
            </div>
            <div className="h-24 rounded-lg bg-app-surface-muted" />
            <div className="h-16 rounded bg-app-surface-muted" />
          </div>
          <div className="space-y-4 border-t border-app p-5 lg:border-l lg:border-t-0">
            <div className="h-4 w-16 rounded bg-app-border" />
            <div className="h-8 rounded bg-app-border" />
            <div className="h-4 w-20 rounded bg-app-border" />
            <div className="h-20 rounded bg-app-border" />
          </div>
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

  return (
    <div className="mx-auto max-w-5xl px-3 pb-8 pt-4 sm:px-4 sm:pt-6">
      <nav className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-app-muted transition-colors hover:text-app-accent"
        >
          <span aria-hidden>←</span>
          Входящие
        </Link>
      </nav>

      {error && (
        <div className="chip-danger mb-4 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading || !todo ? (
        !error && <DetailSkeleton />
      ) : (
        <TodoEditForm todo={todo} tags={tags} onSaved={setTodo}>
          <SubtaskList
            embedded
            todoId={todo.id}
            onSummaryChange={handleSubtaskSummaryChange}
          />
        </TodoEditForm>
      )}
    </div>
  );
}
