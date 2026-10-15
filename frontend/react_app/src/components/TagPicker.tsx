import { Link } from "react-router-dom";

import { ChoiceChip, PropertyField } from "@/components/FormFields";
import {
  useHiddenSystemTags,
  visibleTagOptions,
  type TagOption,
} from "@/lib/tags";

export function TagPicker({
  tags,
  selectedIds,
  onToggle,
  label = "Теги",
}: {
  tags: TagOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  label?: string;
}) {
  const { hidden } = useHiddenSystemTags();
  const allTags = visibleTagOptions(tags, hidden, selectedIds);

  if (allTags.length === 0) {
    return (
      <p className="text-xs text-app-subtle">
        Нет тегов. Добавьте их в{" "}
        <Link to="/settings" className="text-app-accent hover:underline">
          Настройках
        </Link>
        .
      </p>
    );
  }

  return (
    <PropertyField label={label}>
      <div className="flex flex-wrap gap-1">
        {allTags.map((tag) => (
          <ChoiceChip
            key={tag.id}
            selected={selectedIds.includes(tag.id)}
            onClick={() => onToggle(tag.id)}
          >
            #{tag.tag_name}
          </ChoiceChip>
        ))}
      </div>
    </PropertyField>
  );
}
