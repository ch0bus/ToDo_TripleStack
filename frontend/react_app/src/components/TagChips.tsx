import type { TagRef } from "@/lib/tags";
import { tagNames } from "@/lib/tags";

export function TagChips({ tags }: { tags?: TagRef[] | null }) {
  const names = tagNames(tags);
  if (!names.length) return null;
  return (
    <div className="mt-1 flex h-[22px] min-w-0 items-center gap-1 overflow-hidden">
      {names.map((tag) => (
        <span
          key={tag}
          className="chip-default shrink-0 rounded-full border px-1.5 py-px text-[11px] leading-4"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
