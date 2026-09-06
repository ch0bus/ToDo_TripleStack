"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";
  const currentSearch = searchParams.get("search") ?? "";

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs md:text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs md:text-sm"
        >
          <option value="">Все статусы</option>
          <option value="todo">TODO</option>
          <option value="in_progress">В работе</option>
          <option value="done">Готово</option>
        </select>

        <select
          value={currentPriority}
          onChange={(e) => updateParam("priority", e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs md:text-sm"
        >
          <option value="">Все приоритеты</option>
          <option value="critical">Критический</option>
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
        </select>

        <input
          type="text"
          placeholder="Поиск по названию и описанию..."
          defaultValue={currentSearch}
          onBlur={(e) => updateParam("search", e.target.value)}
          className="min-w-[160px] flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1
                     text-xs md:text-sm placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}
