import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SubtaskList } from "@/components/SubtaskList";
import { TodoEditForm, type TodoEditData } from "@/components/TodoEditForm";
import { apiFetch } from "@/lib/api";
import type { TagOption } from "@/lib/tags";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-blue-400 hover:underline">
        ← К списку
      </Link>

      {error && (
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading || !todo ? (
        <p className="text-sm text-slate-400">Загрузка задачи...</p>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-semibold">{todo.title}</h1>

          <TodoEditForm todo={todo} tags={tags} onSaved={setTodo} />

          <SubtaskList todoId={todo.id} />
        </>
      )}
    </div>
  );
}
