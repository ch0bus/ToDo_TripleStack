import { useEffect, useState } from "react";

export interface TagOption {
  id: number;
  tag_name: string;
  kind: string;
  is_system: boolean;
}

const HIDDEN_IDS_KEY = "todo_hidden_system_tag_ids";
const LEGACY_HIDE_ALL_KEY = "todo_hide_system_tags";
const hiddenTagListeners = new Set<() => void>();

export type HiddenSystemTags = {
  ids: ReadonlySet<number>;
  /** Старый флаг «скрыть все», пока нет списка id. */
  hideAll: boolean;
};

function parseHiddenIds(): number[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HIDDEN_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => Number.isInteger(id));
  } catch {
    return [];
  }
}

export function getHiddenSystemTags(): HiddenSystemTags {
  if (typeof window === "undefined") {
    return { ids: new Set(), hideAll: false };
  }
  const ids = new Set(parseHiddenIds());
  const hideAll =
    localStorage.getItem(HIDDEN_IDS_KEY) === null &&
    localStorage.getItem(LEGACY_HIDE_ALL_KEY) === "1";
  return { ids, hideAll };
}

export function setHiddenSystemTagIds(ids: Iterable<number>): void {
  const unique = [...new Set(ids)]
    .filter((id) => Number.isInteger(id))
    .sort((a, b) => a - b);
  if (unique.length) {
    localStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify(unique));
  } else {
    localStorage.removeItem(HIDDEN_IDS_KEY);
  }
  localStorage.removeItem(LEGACY_HIDE_ALL_KEY);
  hiddenTagListeners.forEach((fn) => fn());
}

export function isHiddenSystemTag(
  tagId: number,
  hidden: HiddenSystemTags,
): boolean {
  if (hidden.hideAll) return true;
  return hidden.ids.has(tagId);
}

export function hiddenIdsForSystemTags(
  systemTags: TagOption[],
  hidden: HiddenSystemTags,
): number[] {
  if (hidden.hideAll) return systemTags.map((tag) => tag.id);
  return systemTags.filter((tag) => hidden.ids.has(tag.id)).map((tag) => tag.id);
}

export function useHiddenSystemTags(): {
  hidden: HiddenSystemTags;
  setHiddenIds: (ids: Iterable<number>) => void;
} {
  const [hidden, setHidden] = useState(getHiddenSystemTags);
  useEffect(() => {
    const sync = () => setHidden(getHiddenSystemTags());
    hiddenTagListeners.add(sync);
    function onStorage(event: StorageEvent) {
      if (
        event.key === HIDDEN_IDS_KEY ||
        event.key === LEGACY_HIDE_ALL_KEY ||
        event.key === null
      ) {
        sync();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => {
      hiddenTagListeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return { hidden, setHiddenIds: setHiddenSystemTagIds };
}

/** Системные теги первыми; скрытые не отдаём, кроме уже выбранных. */
export function visibleTagOptions(
  tags: TagOption[],
  hidden: HiddenSystemTags,
  keepIds: Iterable<number> = [],
): TagOption[] {
  const keep = new Set(keepIds);
  const system = tags.filter(
    (tag) =>
      tag.is_system && (!isHiddenSystemTag(tag.id, hidden) || keep.has(tag.id)),
  );
  const user = tags.filter((tag) => !tag.is_system);
  return [...system, ...user];
}

export const TAG_KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "work", label: "Работа" },
  { value: "personal", label: "Личное" },
  { value: "health", label: "Здоровье" },
  { value: "finance", label: "Финансы" },
  { value: "shopping", label: "Покупки" },
  { value: "home", label: "Дом" },
  { value: "hobby", label: "Хобби" },
  { value: "other", label: "Другое" },
];
