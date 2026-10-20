import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { ArchiveShell } from "@/components/ArchiveShell";
import { ListReveal } from "@/components/ListReveal";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { resolveArchiveRange, tagCounts } from "@/lib/archive";
import { backFromState } from "@/lib/nav";
import {
  isCompletedLate,
  todoCompletedInRange,
} from "@/lib/todoFilters";
import { sortTodosCompleted } from "@/lib/todoSort";

export function ArchiveTodosPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const backTo = backFromState(location.state);
  const tag = searchParams.get("tag") ?? undefined;
  const range = resolveArchiveRange(searchParams);

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError("");
        setLoading(true);
        const query = new URLSearchParams({ status: "done" });
        if (tag) query.set("tag", tag);
        const res = await apiFetch(`/todos/?${query.toString()}`);
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as TodoRow[];
        if (!cancelled) setTodos(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить готовые задачи");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  const rows = useMemo(() => {
    return sortTodosCompleted(
      todos.filter((todo) =>
        todoCompletedInRange(todo, range.from, range.to),
      ),
    );
  }, [todos, range.from, range.to]);

  const late = useMemo(
    () => rows.filter((todo) => isCompletedLate(todo)).length,
    [rows],
  );
  const tags = useMemo(() => tagCounts(rows), [rows]);
  const facts = [
    rows.length ? `${rows.length} закрыто` : "",
    late ? `${late} с опозданием` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ArchiveShell
      kind="todos"
      title="Завершённые задачи"
      backTo={backTo}
      loading={loading}
      error={error}
      facts={loading ? "" : facts}
      extra={
        tags.length ? (
          <p className="text-sm text-app-subtle">
            {tags.map((item) => `${item.name} ${item.count}`).join(" · ")}
          </p>
        ) : null
      }
    >
      {rows.length > 0 ? (
        <ListReveal items={rows}>
          {(visible) => (
            <TodoList
              todos={visible}
              whenMode="archive"
              onUpdated={(todo) =>
                setTodos((prev) =>
                  todo.status === "done"
                    ? prev.map((row) => (row.id === todo.id ? todo : row))
                    : prev.filter((row) => row.id !== todo.id),
                )
              }
              onDeleted={(id) =>
                setTodos((prev) => prev.filter((row) => row.id !== id))
              }
            />
          )}
        </ListReveal>
      ) : loading ? null : (
        <p className="text-sm text-app-subtle">
          {tag ? "Нет готовых задач с этим тегом" : "Нет готовых задач"}
        </p>
      )}
    </ArchiveShell>
  );
}
