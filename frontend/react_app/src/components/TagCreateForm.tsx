import { useState, type FormEvent } from "react";

import { apiFetch } from "@/lib/api";
import type { TagOption } from "@/lib/tags";
import { btnSecondary, inputClass } from "@/lib/uiClasses";

interface TagCreateFormProps {
  onCreated: (tag: TagOption) => void;
}

export function TagCreateForm({ onCreated }: TagCreateFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError("");
      const res = await apiFetch("/tags/", {
        method: "POST",
        body: JSON.stringify({ tag_name: trimmed, kind: "other" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data.tag_name?.[0] as string) ||
            (data.detail as string) ||
            "Не удалось создать тег",
        );
      }
      onCreated(data as TagOption);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-xs text-[var(--app-danger)]" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название тега..."
          maxLength={100}
          className={inputClass + " min-w-0 flex-1 py-1.5 text-sm"}
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className={btnSecondary + " shrink-0 py-1.5 disabled:opacity-50"}
        >
          {loading ? "..." : "Создать"}
        </button>
      </div>
    </form>
  );
}
