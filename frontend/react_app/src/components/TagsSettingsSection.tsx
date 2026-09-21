import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TagCreateForm } from "@/components/TagCreateForm";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  TAG_KIND_OPTIONS,
  hiddenIdsForSystemTags,
  isHiddenSystemTag,
  useHiddenSystemTags,
  type TagOption,
} from "@/lib/tags";

function kindLabel(kind: string): string {
  return TAG_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

function TagRowsSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-9 rounded-md bg-app-surface-muted" />
      ))}
    </div>
  );
}

export function TagsSettingsSection() {
  const { pushToast } = useToast();
  const { hidden, setHiddenIds } = useHiddenSystemTags();
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TagOption | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/tags/");
    if (res.ok) {
      setTags((await res.json()) as TagOption[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const systemTags = tags.filter((t) => t.is_system);
  const userTags = tags.filter((t) => !t.is_system);

  useEffect(() => {
    if (!hidden.hideAll) return;
    const ids = tags.filter((tag) => tag.is_system).map((tag) => tag.id);
    if (!ids.length) return;
    setHiddenIds(ids);
  }, [hidden.hideAll, tags, setHiddenIds]);

  function toggleSystemTagHidden(tag: TagOption) {
    const current = new Set(hiddenIdsForSystemTags(systemTags, hidden));
    if (current.has(tag.id)) current.delete(tag.id);
    else current.add(tag.id);
    setHiddenIds(current);
  }

  function handleCreated(tag: TagOption) {
    setTags((prev) =>
      [...prev.filter((t) => t.id !== tag.id), tag].sort((a, b) =>
        a.tag_name.localeCompare(b.tag_name, "ru"),
      ),
    );
    pushToast(`Тег «${tag.tag_name}» создан`, "success");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleteBusy(true);
      const res = await apiFetch(`/tags/${deleteTarget.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      pushToast(`Тег «${deleteTarget.tag_name}» удалён`, "success");
      setDeleteTarget(null);
    } catch {
      pushToast("Не удалось удалить тег", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return <TagRowsSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          Системные
        </h3>
        {systemTags.length === 0 ? (
          <p className="text-sm text-app-subtle">Пока нет системных тегов</p>
        ) : (
          <ul className="space-y-1">
            {systemTags.map((tag) => {
              const hiddenInUi = isHiddenSystemTag(tag.id, hidden);
              return (
                <li
                  key={tag.id}
                  className={
                    "flex items-center justify-between gap-2 rounded-md bg-app-surface-muted px-3 py-2 text-app " +
                    (hiddenInUi ? "opacity-60" : "")
                  }
                >
                  <span className="min-w-0">
                    <span className="text-sm">{tag.tag_name}</span>
                    <span className="ml-2 text-xs text-app-subtle">
                      {kindLabel(tag.kind)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSystemTagHidden(tag)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-app-muted hover:bg-app-surface hover:text-app"
                  >
                    {hiddenInUi ? "Показать" : "Скрыть"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          Мои
        </h3>
        {userTags.length === 0 ? (
          <p className="mb-3 text-sm text-app-subtle">Пока нет личных тегов</p>
        ) : (
          <ul className="mb-3 space-y-1">
            {userTags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-2 rounded-md bg-app-surface-muted px-3 py-2 text-sm text-app"
              >
                <span>{tag.tag_name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(tag)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)]"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
        <TagCreateForm onCreated={handleCreated} />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Удалить тег?"
        message={
          deleteTarget
            ? `«${deleteTarget.tag_name}» будет удалён. Задачи сохранятся, но связь с тегом пропадёт.`
            : ""
        }
        confirmLabel="Удалить"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
