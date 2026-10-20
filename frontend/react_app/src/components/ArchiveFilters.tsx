import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ChoiceChip } from "@/components/FormFields";
import { SearchField } from "@/components/SearchField";
import {
  useHiddenSystemTags,
  visibleTagOptions,
  type TagOption,
} from "@/lib/tags";

function setParam(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  name: string,
  value: string,
) {
  setSearchParams(
    (prev) => {
      const params = new URLSearchParams(prev);
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete("page");
      return params;
    },
    { replace: true },
  );
}

export function ArchiveSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [input, setInput] = useState(q);

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed === q) return;
      setParam(setSearchParams, "q", trimmed);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input, q, setSearchParams]);

  return (
    <SearchField
      value={input}
      onChange={setInput}
      onSubmit={(query) => setParam(setSearchParams, "q", query)}
      placeholder="Поиск"
    />
  );
}

export function ArchiveTagFilter({ tags }: { tags: TagOption[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag") ?? "";
  const { hidden } = useHiddenSystemTags();
  const options = visibleTagOptions(tags, hidden, tag ? [Number(tag)] : []);
  if (!options.length) return null;

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Тег">
      <ChoiceChip selected={!tag} onClick={() => setParam(setSearchParams, "tag", "")}>
        Все
      </ChoiceChip>
      {options.map((option) => (
        <ChoiceChip
          key={option.id}
          selected={tag === String(option.id)}
          onClick={() =>
            setParam(
              setSearchParams,
              "tag",
              tag === String(option.id) ? "" : String(option.id),
            )
          }
        >
          {option.tag_name}
        </ChoiceChip>
      ))}
    </div>
  );
}

export function ArchiveTodoStatusFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const late = searchParams.get("late");

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Статус">
      <ChoiceChip
        selected={late !== "0" && late !== "1"}
        onClick={() => setParam(setSearchParams, "late", "")}
      >
        Все
      </ChoiceChip>
      <ChoiceChip
        selected={late === "0"}
        onClick={() => setParam(setSearchParams, "late", late === "0" ? "" : "0")}
      >
        Вовремя
      </ChoiceChip>
      <ChoiceChip
        selected={late === "1"}
        onClick={() => setParam(setSearchParams, "late", late === "1" ? "" : "1")}
      >
        С опозданием
      </ChoiceChip>
    </div>
  );
}

export function ArchiveEventStatusFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const attn = searchParams.get("eattn") ?? "";

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Статус">
      <ChoiceChip
        selected={attn === "all"}
        onClick={() => setParam(setSearchParams, "eattn", attn === "all" ? "" : "all")}
      >
        Все
      </ChoiceChip>
      <ChoiceChip
        selected={!attn || attn === "attended"}
        onClick={() => setParam(setSearchParams, "eattn", "")}
      >
        Отмечены
      </ChoiceChip>
      <ChoiceChip
        selected={attn === "open"}
        onClick={() =>
          setParam(setSearchParams, "eattn", attn === "open" ? "" : "open")
        }
      >
        Пропущено
      </ChoiceChip>
    </div>
  );
}
