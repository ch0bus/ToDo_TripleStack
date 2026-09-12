import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import type { TagOption } from "@/lib/tags";
import { btnPrimary, cardClass } from "@/lib/uiClasses";

interface DashboardSidebarProps {
  tags: TagOption[];
  onNewTask: () => void;
  onNavigate?: () => void;
  className?: string;
}

function navButtonClass(active: boolean): string {
  return (
    "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
    (active ? "nav-item-active" : "nav-item")
  );
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
    return <p className="px-2 py-1 text-xs text-app-subtle">Пока нет</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {items.map((tag) => (
        <li key={tag.id}>
          <button
            type="button"
            onClick={() => onSelect(String(tag.id))}
            className={navButtonClass(activeTag === String(tag.id))}
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const onInbox = location.pathname === "/";

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
    if (!onInbox) {
      navigate(tagId ? `/?tag=${encodeURIComponent(tagId)}` : "/");
      onNavigate?.();
      return;
    }
    setParams((p) => {
      if (tagId) p.set("tag", tagId);
      else p.delete("tag");
    });
  }

  function selectPreset(value: string) {
    if (!onInbox) {
      navigate(value === "all" ? "/" : `/?preset=${encodeURIComponent(value)}`);
      onNavigate?.();
      return;
    }
    setParams((p) => {
      if (value === "all") p.delete("preset");
      else p.set("preset", value);
    });
  }

  function clearTagsAndPreset() {
    if (!onInbox) {
      navigate("/");
      onNavigate?.();
      return;
    }
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
        "space-y-6 p-4 lg:sticky lg:top-24 lg:self-start " + cardClass + " " + className
      }
    >
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-muted">
          Теги
        </h2>
        <ul className="mb-3 space-y-1 text-sm">
          <li>
            <button
              type="button"
              onClick={clearTagsAndPreset}
              className={navButtonClass(allTasksActive)}
            >
              Все задачи
            </button>
          </li>
        </ul>

        <p className="mb-1 px-2 text-[10px] uppercase text-app-subtle">Системные</p>
        <TagList
          items={systemTags}
          activeTag={activeTag}
          onSelect={selectTag}
        />

        <p className="mb-1 mt-3 px-2 text-[10px] uppercase text-app-subtle">Мои</p>
        <TagList items={userTags} activeTag={activeTag} onSelect={selectTag} />

        <p className="mt-2 px-2 text-[10px] text-app-subtle">
          Создать тег — в{" "}
          <Link to="/settings" className="text-app-accent hover:underline">
            Настройках
          </Link>
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-muted">
          Быстрые фильтры
        </h2>
        <ul className="space-y-1 text-sm">
          {[
            { id: "all", label: "Все", value: "all" },
            { id: "today", label: "Сегодня", value: "today" },
            { id: "overdue", label: "Просрочено", value: "overdue" },
          ].map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectPreset(item.value)}
                className={navButtonClass(preset === item.value)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={handleNewTask} className={btnPrimary + " w-full"}>
        + Новая задача
      </button>
    </aside>
  );
}
