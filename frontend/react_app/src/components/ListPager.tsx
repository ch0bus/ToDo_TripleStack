import { useSearchParams } from "react-router-dom";

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  parsePage,
  parsePageSize,
} from "@/lib/listPage";
import { selectClass } from "@/lib/uiClasses";

export function ListPager({ total }: { total: number }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageSize = parsePageSize(searchParams.get("limit"));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = parsePage(searchParams.get("page"), pageCount);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function setPage(next: number) {
    const clamped = Math.min(Math.max(1, next), pageCount);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (clamped <= 1) params.delete("page");
        else params.set("page", String(clamped));
        return params;
      },
      { replace: true },
    );
  }

  function setPageSize(next: number) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete("page");
        if (next === DEFAULT_PAGE_SIZE) params.delete("limit");
        else params.set("limit", String(next));
        return params;
      },
      { replace: true },
    );
  }

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-sm text-app-subtle">
        {from}–{to} из {total}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-app-muted">
          На странице
          <select
            className={selectClass + " h-8 py-1"}
            value={pageSize}
            aria-label="Сколько записей показывать"
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        {pageCount > 1 ? (
          <div className="flex items-center gap-1" role="navigation" aria-label="Страницы">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-app-muted hover:bg-app-surface-muted hover:text-app disabled:opacity-40"
              disabled={page <= 1}
              aria-label="Предыдущая страница"
              onClick={() => setPage(page - 1)}
            >
              ←
            </button>
            <span className="min-w-[4.5rem] text-center text-sm text-app-muted">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-app-muted hover:bg-app-surface-muted hover:text-app disabled:opacity-40"
              disabled={page >= pageCount}
              aria-label="Следующая страница"
              onClick={() => setPage(page + 1)}
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
