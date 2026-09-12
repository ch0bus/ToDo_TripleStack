import { useEffect, useId, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { toDateKey } from "@/lib/calendar";
import type { DayNote } from "@/lib/dayNotes";
import { formatDueDateShort } from "@/lib/utils";
import { btnPrimary } from "@/lib/uiClasses";

interface DayNoteEditorProps {
  dateKey: string;
  note: DayNote | undefined;
  onChanged: (note: DayNote | null) => void;
}

function dateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (toDateKey(date) === toDateKey(new Date())) return "сегодня";
  return formatDueDateShort(date.toISOString());
}

function NoteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-5 w-5 shrink-0 text-[var(--calendar-note-frame)]"
      aria-hidden
    >
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function DayNoteEditor({ dateKey, note, onChanged }: DayNoteEditorProps) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(note?.text ?? "");
  const [editing, setEditing] = useState(!note);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setText(note?.text ?? "");
    setEditing(!note);
    setError("");
    setMenuOpen(false);
  }, [dateKey, note?.text, note]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const trimmed = text.trim();
  const dirty = trimmed !== (note?.text ?? "");
  const [title, ...restParts] = (note?.text ?? "").split(/\n+/);
  const rest = restParts.join(" ");

  async function save() {
    if (!trimmed) return;
    try {
      setBusy(true);
      setError("");
      const res = await apiFetch("/day-notes/", {
        method: "PUT",
        body: JSON.stringify({ date: dateKey, text: trimmed }),
      });
      if (!res.ok) throw new Error("save failed");
      onChanged((await res.json()) as DayNote);
      setEditing(false);
    } catch (e) {
      console.error(e);
      setError("Не удалось сохранить заметку");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      setBusy(true);
      setError("");
      setMenuOpen(false);
      const res = await apiFetch(`/day-notes/${dateKey}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("delete failed");
      setText("");
      onChanged(null);
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить заметку");
    } finally {
      setBusy(false);
    }
  }

  if (note && !editing) {
    return (
      <ul className="space-y-3">
        <li
          className={
            "group relative flex rounded-lg border bg-app-surface calendar-day-note " +
            (busy ? "opacity-80 " : "") +
            (menuOpen ? "z-20" : "")
          }
        >
          <div
            className="w-1 shrink-0 self-stretch rounded-l-lg bg-[var(--calendar-note-frame)]"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 sm:gap-2.5 sm:px-3 sm:py-2">
            <NoteIcon />
            <div className="min-w-0 flex-1 pt-px">
              <p className="truncate text-[15px] font-medium leading-snug text-app">
                {title}
              </p>
              {rest ? (
                <p className="mt-0.5 truncate text-[12px] leading-relaxed text-app-subtle">
                  {rest}
                </p>
              ) : (
                <p className="mt-0.5 truncate text-[12px] leading-relaxed text-app-subtle">
                  Заметка
                </p>
              )}
            </div>
            <div className="flex w-28 shrink-0 flex-col items-end pt-0.5 text-right text-xs text-app-subtle">
              {dateLabel(dateKey)}
            </div>
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-md p-1.5 text-app-subtle opacity-70 hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 disabled:opacity-40"
                aria-label="Действия с заметкой"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
              >
                <MoreIcon />
              </button>
              {menuOpen && (
                <div
                  id={menuId}
                  role="menu"
                  className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-app bg-app-modal py-1 shadow-app"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-app hover:bg-app-surface-muted"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => void remove()}
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)]"
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </div>
        </li>
      </ul>
    );
  }

  return (
    <div
      className={
        "space-y-2 rounded-lg border bg-app-surface px-3 py-3 " +
        (note ? "calendar-day-note" : "border-app")
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
        {note ? "Заметка дня" : "Новая заметка"}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={busy}
        placeholder="Напишите заметку к этому дню"
        className="w-full resize-y rounded-md border border-app bg-app-input px-3 py-2 text-sm text-app placeholder:text-app-subtle focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none"
      />
      {error && <p className="text-xs text-[var(--app-danger)]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !trimmed || !dirty}
          onClick={() => void save()}
          className={btnPrimary}
        >
          {busy ? "Сохраняю..." : "Сохранить"}
        </button>
        {note && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setText(note.text);
              setEditing(false);
              setError("");
            }}
            className="rounded-md px-3 py-2 text-sm text-app-muted hover:bg-app-surface-muted"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
