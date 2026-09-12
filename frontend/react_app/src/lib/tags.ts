export interface TagOption {
  id: number;
  tag_name: string;
  kind: string;
  is_system: boolean;
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
