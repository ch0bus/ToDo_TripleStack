import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { TodoForm } from "@/components/TodoForm";
import { apiFetch } from "@/lib/api";
import { defaultDueAtDay, parseDateKey } from "@/lib/calendar";
import { backFromState, backLabel } from "@/lib/nav";
import type { TagOption } from "@/lib/tags";
import { toDatetimeLocalValue } from "@/lib/utils";

export function TodoCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backTo = backFromState(location.state);
  const day = parseDateKey(searchParams.get("day") ?? "");
  const defaultEventDate = day
    ? toDatetimeLocalValue(defaultDueAtDay(day).toISOString())
    : "";

  const [tags, setTags] = useState<TagOption[]>([]);

  useEffect(() => {
    async function loadTags() {
      const res = await apiFetch("/tags/");
      if (res.ok) setTags((await res.json()) as TagOption[]);
    }
    void loadTags();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-3 pb-8 pt-4 sm:px-4 sm:pt-6">
      <nav className="mb-4 flex items-center gap-3">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-app-muted transition-colors hover:text-app-accent"
        >
          <span aria-hidden>←</span>
          {backLabel(backTo)}
        </Link>
      </nav>
      <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
        <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
          <h1 className="mb-4 text-xl font-semibold text-app sm:text-2xl">
            Новая задача
          </h1>
          <TodoForm
            tags={tags}
            defaultEventDate={defaultEventDate}
            onCreated={(todo) => {
              const id = (todo as { id?: number }).id;
              if (id) {
                navigate(`/todos/${id}`, { replace: true, state: { from: backTo } });
                return;
              }
              navigate(backTo, { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
