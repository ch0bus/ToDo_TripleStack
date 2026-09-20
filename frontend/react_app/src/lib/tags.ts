import { useEffect, useState } from "react";

export interface TagOption {
  id: number;
  tag_name: string;
  kind: string;
  is_system: boolean;
}

const HIDE_SYSTEM_TAGS_KEY = "todo_hide_system_tags";
const hideSystemListeners = new Set<() => void>();

export function getHideSystemTags(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HIDE_SYSTEM_TAGS_KEY) === "1";
}

export function setHideSystemTags(hide: boolean): void {
  if (hide) localStorage.setItem(HIDE_SYSTEM_TAGS_KEY, "1");
  else localStorage.removeItem(HIDE_SYSTEM_TAGS_KEY);
  hideSystemListeners.forEach((fn) => fn());
}

export function useHideSystemTags(): [boolean, (hide: boolean) => void] {
  const [hide, setHide] = useState(getHideSystemTags);
  useEffect(() => {
    const sync = () => setHide(getHideSystemTags());
    hideSystemListeners.add(sync);
    function onStorage(event: StorageEvent) {
      if (event.key === HIDE_SYSTEM_TAGS_KEY || event.key === null) sync();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      hideSystemListeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return [hide, setHideSystemTags];
}

/** Системные теги первыми; скрытые не отдаём, кроме уже выбранных. */
export function visibleTagOptions(
  tags: TagOption[],
  hideSystem: boolean,
  keepIds: Iterable<number> = [],
): TagOption[] {
  const keep = new Set(keepIds);
  const system = tags.filter(
    (tag) => tag.is_system && (!hideSystem || keep.has(tag.id)),
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
