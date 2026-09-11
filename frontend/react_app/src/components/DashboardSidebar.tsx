import { Link, useSearchParams } from "react-router-dom";

import type { TagOption } from "@/lib/tags";

interface DashboardSidebarProps {
  tags: TagOption[];
  onNewTask: () => void;
  onNavigate?: () => void;
  className?: string;
}

function TagList({
  items,
  activeTag,
  onSelect,
}: {
  items: TagOption[];
  activeTag: string;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return <p className="px-2 py-1 text-xs text-slate-500">Пока нет</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {items.map((tag) => (
        <li key={tag.id}>
          <button
            type="button"
            onClick={() => onSelect(String(tag.id))}
            className={
              activeTag === String(tag.id)
                ? "w-full rounded-md bg-slate-800 px-2 py-1.5 text-left text-blue-300"
                : "w-full rounded-md px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
            }
          >
            {tag.tag_name}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSidebar({
  tags,
  onNewTask,
  onNavigate,
  className = "",
}: DashboardSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTag = searchParams.get("tag") ?? "";
  const preset = searchParams.get("preset") ?? "all";

  const systemTags = tags.filter((t) => t.is_system);
  const userTags = tags.filter((t) => !t.is_system);

  function setParams(updater: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams);
    updater(next);
    setSearchParams(next);
    onNavigate?.();
  }

  function selectTag(tagId: string) {
    setParams((p) => {
      if (tagId) p.set("tag", tagId);
      else p.delete("tag");
    });
  }

  function selectPreset(value: string) {
    setParams((p) => {
      if (value === "all") p.delete("preset");
      else p.set("preset", value);
    });
  }

  function clearTagsAndPreset() {
    setParams((p) => {
      p.delete("tag");
      p.delete("preset");
    });
  }

  function handleNewTask() {
    onNewTask();
    onNavigate?.();
  }

  const allTasksActive = !activeTag && preset === "all";

  return (
    <aside
      className={
        "space-y-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:sticky lg:top-24 lg:self-start " +
        className
      }
    >
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Теги
        </h2>
        <ul className="mb-3 space-y-1 text-sm">
          <li>
            <button
              type="button"
              onClick={clearTagsAndPreset}
              className={
                allTasksActive
                  ? "w-full rounded-md bg-slate-800 px-2 py-1.5 text-left text-blue-300"
                  : "w-full rounded-md px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
              }
            >
              ✓ Все задачи
            </button>
          </li>
        </ul>

        <p className="mb-1 px-2 text-[10px] uppercase text-slate-500">Системные</p>
        <TagList
          items={systemTags}
          activeTag={activeTag}
          onSelect={selectTag}
        />

        <p className="mb-1 mt-3 px-2 text-[10px] uppercase text-slate-500">Мои</p>
        <TagList items={userTags} activeTag={activeTag} onSelect={selectTag} />

        <p className="mt-2 px-2 text-[10px] text-slate-500">
          Создать тег — в{" "}
          <Link to="/settings" className="text-blue-400 hover:underline">
            Настройках
          </Link>
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Быстрые фильтры
        </h2>
        <ul className="space-y-1 text-sm">
          {[
            { id: "all", label: "📋 Все", value: "all" },
            { id: "today", label: "📅 Сегодня", value: "today" },
            { id: "overdue", label: "⚠️ Просрочено", value: "overdue" },
          ].map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectPreset(item.value)}
                className={
                  preset === item.value
                    ? "w-full rounded-md bg-slate-800 px-2 py-1.5 text-left text-blue-300"
                    : "w-full rounded-md px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
                }
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={handleNewTask}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
      >
        + Новая задача
      </button>
    </aside>
  );
}
