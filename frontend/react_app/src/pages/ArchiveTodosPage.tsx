import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import {
  ArchiveTagFilter,
  ArchiveTodoStatusFilter,
} from "@/components/ArchiveFilters";
import { ArchiveShell } from "@/components/ArchiveShell";
import { ListPager } from "@/components/ListPager";
import { SortBar } from "@/components/SortBar";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { resolveArchiveRange } from "@/lib/archive";
import {
  matchesArchiveQuery,
  pageSlice,
  parsePage,
  parsePageSize,
} from "@/lib/listPage";
import { backFromState } from "@/lib/nav";
import {
  useHiddenSystemTags,
  visibleTagOptions,
  type TagOption,
} from "@/lib/tags";
import {
  isCompletedLate,
  todoCompletedInRange,
} from "@/lib/todoFilters";
import { parseTodoSort, sortArchiveTodos } from "@/lib/todoSort";

export function ArchiveTodosPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const backTo = backFromState(location.state);
  const tag = searchParams.get("tag") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const late = searchParams.get("late");
  const range = resolveArchiveRange(searchParams);
  const sort = parseTodoSort(searchParams.get("sort"), "new");
  const { hidden } = useHiddenSystemTags();

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError("");
        setLoading(true);
        const [todosRes, tagsRes] = await Promise.all([
          apiFetch("/todos/?status=done"),
          apiFetch("/tags/"),
        ]);
        if (!todosRes.ok) throw new Error("load failed");
        const data = (await todosRes.json()) as TodoRow[];
        if (cancelled) return;
        setTodos(data);
        if (tagsRes.ok) {
          setTags((await tagsRes.json()) as TagOption[]);
        }
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
  }, []);

  const rows = useMemo(() => {
    const filtered = todos.filter((todo) => {
      if (!todoCompletedInRange(todo, range.from, range.to)) return false;
      if (tag && !(todo.tags ?? []).some((item) => String(item.id) === tag)) {
        return false;
      }
      if (late === "1" && !isCompletedLate(todo)) return false;
      if (late === "0" && isCompletedLate(todo)) return false;
      if (
        !matchesArchiveQuery(
          [
            todo.title,
            todo.description,
            ...(todo.tags ?? []).map((item) => item.tag_name),
          ],
          q,
        )
      ) {
        return false;
      }
      return true;
    });
    return sortArchiveTodos(filtered, sort);
  }, [todos, range.from, range.to, tag, late, q, sort]);

  const pageSize = parsePageSize(searchParams.get("limit"));
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = parsePage(searchParams.get("page"), pageCount);
  const visible = pageSlice(rows, page, pageSize);

  const lateCount = useMemo(
    () => rows.filter((todo) => isCompletedLate(todo)).length,
    [rows],
  );
  const facts = [
    rows.length ? `${rows.length} закрыто` : "",
    lateCount ? `${lateCount} с опозданием` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const tagOptions = visibleTagOptions(tags, hidden, tag ? [Number(tag)] : []);

  return (
    <ArchiveShell
      kind="todos"
      title="Завершённые задачи"
      backTo={backTo}
      loading={loading}
      error={error}
      facts={loading ? "" : facts}
      extra={
        <div className="mt-3 space-y-2">
          <ArchiveTodoStatusFilter />
          {tagOptions.length ? <ArchiveTagFilter tags={tags} /> : null}
        </div>
      }
      tools={<SortBar defaultSort="new" />}
    >
      {rows.length > 0 ? (
        <>
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
          <ListPager total={rows.length} />
        </>
      ) : loading ? null : (
        <p className="text-sm text-app-subtle">
          {q
            ? "Ничего не найдено"
            : tag
              ? "Нет готовых задач с этим тегом"
              : late
                ? "Нет задач с этим статусом"
                : "Нет готовых задач"}
        </p>
      )}
    </ArchiveShell>
  );
}
