import { useState, type FormEvent } from "react";

import { apiFetch } from "@/lib/api";
import type { TagOption } from "@/lib/tags";

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
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название тега..."
          maxLength={100}
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="shrink-0 rounded-md bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 disabled:opacity-50"
        >
          {loading ? "..." : "Создать"}
        </button>
      </div>
    </form>
  );
}
