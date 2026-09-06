"use client";

interface TagInputProps {
  availableTags: { id: number; tag_name: string }[];
  value: number[];
  onChange: (ids: number[]) => void;
}

export function TagInput({ availableTags, value, onChange }: TagInputProps) {
  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  if (!availableTags.length) {
    return <p className="text-xs text-slate-500">Тегов пока нет.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {availableTags.map((tag) => {
        const active = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              active
                ? "border-blue-500 bg-blue-600/30 text-blue-100"
                : "border-slate-700 bg-slate-800 text-slate-200"
            }`}
          >
            #{tag.tag_name}
          </button>
        );
      })}
    </div>
  );
}
