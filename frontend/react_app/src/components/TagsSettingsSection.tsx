import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TagCreateForm } from "@/components/TagCreateForm";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import { TAG_KIND_OPTIONS, type TagOption } from "@/lib/tags";

function kindLabel(kind: string): string {
  return TAG_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function TagsSettingsSection() {
  const { pushToast } = useToast();
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
    loadTags();
  }, [loadTags]);

  const systemTags = tags.filter((t) => t.is_system);
  const userTags = tags.filter((t) => !t.is_system);

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

  return (
    <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Теги
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Системные теги общие для всех. Свои теги можно создавать и удалять здесь;
        они появятся в фильтрах на главной.
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">Загрузка тегов...</p>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium text-slate-400">Системные</h3>
            {systemTags.length === 0 ? (
              <p className="text-xs text-slate-500">Нет данных</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-300">
                {systemTags.map((tag) => (
                  <li
                    key={tag.id}
                    className="flex justify-between rounded-md bg-slate-800/60 px-3 py-1.5"
                  >
                    <span>{tag.tag_name}</span>
                    <span className="text-xs text-slate-500">
                      {kindLabel(tag.kind)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium text-slate-400">Мои теги</h3>
            {userTags.length === 0 ? (
              <p className="text-xs text-slate-500">Пока нет личных тегов</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {userTags.map((tag) => (
                  <li
                    key={tag.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-1.5"
                  >
                    <span className="text-slate-200">{tag.tag_name}</span>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tag)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="mb-3 text-xs font-medium text-slate-400">
              Новый тег
            </h3>
            <TagCreateForm onCreated={handleCreated} />
          </div>
        </>
      )}

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
    </section>
  );
}
