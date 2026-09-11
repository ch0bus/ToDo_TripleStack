import { useSearchParams } from "react-router-dom";

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
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
      >
        <option value="">Все статусы</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <select
        value={currentPriority}
        onChange={(e) => updateParam("priority", e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
      >
        <option value="">Все приоритеты</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  );
}
