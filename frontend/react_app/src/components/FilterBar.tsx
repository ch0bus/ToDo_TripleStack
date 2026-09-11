import { useSearchParams } from "react-router-dom";

import {
  PRIORITY_SELECT_OPTIONS,
  STATUS_SELECT_OPTIONS,
} from "@/lib/labels";
import { selectClass } from "@/lib/uiClasses";

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
    <div className="flex flex-wrap gap-2 text-sm">
      <select
        value={currentStatus}
        onChange={(e) => updateParam("status", e.target.value)}
        className={selectClass}
      >
        <option value="">Все статусы</option>
        {STATUS_SELECT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={currentPriority}
        onChange={(e) => updateParam("priority", e.target.value)}
        className={selectClass}
      >
        <option value="">Все приоритеты</option>
        {PRIORITY_SELECT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
