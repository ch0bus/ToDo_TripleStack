import { useSearchParams } from "react-router-dom";

import {
  PRIORITY_SELECT_OPTIONS,
  STATUS_SELECT_OPTIONS,
} from "@/lib/labels";

const filterSelectClass =
  "w-0 min-w-0 flex-1 rounded-md border border-app bg-app-input px-2 py-1.5 text-xs text-app focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none sm:px-3 sm:py-2 sm:text-sm";

export function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    setSearchParams(params);
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
      <select
        value={currentStatus}
        onChange={(e) => updateParam("status", e.target.value)}
        className={filterSelectClass}
      >
        <option value="">Статус</option>
        {STATUS_SELECT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={currentPriority}
        onChange={(e) => updateParam("priority", e.target.value)}
        className={filterSelectClass}
      >
        <option value="">Приоритет</option>
        {PRIORITY_SELECT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
