import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useHideSystemTags, type TagOption } from "@/lib/tags";
import { cardClass } from "@/lib/uiClasses";

interface DashboardSidebarProps {
  tags: TagOption[];
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
  onNavigate,
  className = "",
}: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hideSystem] = useHideSystemTags();
  const onInbox = location.pathname === "/";

  const activeTag = searchParams.get("tag") ?? "";

  const systemTags = tags.filter(
    (t) => t.is_system && (!hideSystem || String(t.id) === activeTag),
  );
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

  function clearTag() {
    if (!onInbox) {
      navigate("/");
      onNavigate?.();
      return;
    }
    setParams((p) => {
      p.delete("tag");
    });
  }

  const allTasksActive = !activeTag;

  return (
    <aside
      className={
        "space-y-6 p-4 lg:sticky lg:top-6 lg:self-start " + cardClass + " " + className
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
              onClick={clearTag}
              className={navButtonClass(allTasksActive)}
            >
              Все задачи
            </button>
          </li>
        </ul>

        {systemTags.length > 0 ? (
          <>
            <p className="mb-1 px-2 text-[10px] uppercase text-app-subtle">
              Системные
            </p>
            <TagList
              items={systemTags}
              activeTag={activeTag}
              onSelect={selectTag}
            />
          </>
        ) : null}

        <p
          className={
            "mb-1 px-2 text-[10px] uppercase text-app-subtle" +
            (systemTags.length > 0 ? " mt-3" : "")
          }
        >
          Мои
        </p>
        <TagList items={userTags} activeTag={activeTag} onSelect={selectTag} />

        <p className="mt-2 px-2 text-[10px] text-app-subtle">
          Создать тег — в{" "}
          <Link to="/settings" className="text-app-accent hover:underline">
            Настройках
          </Link>
        </p>
      </div>
    </aside>
  );
}
