import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import {
  dayNotePath,
  formatDayNoteLabel,
  type DayNote,
} from "@/lib/dayNotes";

interface DayNoteEditorProps {
  dateKey: string;
  note: DayNote | undefined;
  onChanged: (note: DayNote | null) => void;
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const from = location.pathname + location.search;
  const href = dayNotePath(dateKey);

  const [title, ...restParts] = (note?.text ?? "").split(/\n+/);
  const rest = restParts.join(" ");

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

  async function remove() {
    try {
      setBusy(true);
      setMenuOpen(false);
      const res = await apiFetch(`/day-notes/${dateKey}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("delete failed");
      onChanged(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (!note) {
    return (
      <Link
        to={href}
        state={{ from }}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-app px-3 py-2.5 text-left text-sm text-app-subtle hover:bg-app-surface-muted hover:text-app"
      >
        <NoteIcon />
        Добавить заметку
      </Link>
    );
  }

  return (
    <ul className="min-w-0">
      <li
        className={
          "group relative flex min-w-0 max-w-full rounded-lg border bg-app-surface calendar-day-note " +
          (busy ? "opacity-80 " : "") +
          (menuOpen ? "z-20 overflow-visible " : "overflow-hidden ")
        }
      >
        <div
          className="w-1 shrink-0 self-stretch rounded-l-lg bg-[var(--calendar-note-frame)]"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 items-start gap-1 px-2 py-2 sm:gap-2.5 sm:px-3">
          <Link
            to={href}
            state={{ from }}
            className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden text-left hover:opacity-90"
          >
            <NoteIcon />
            <div className="min-w-0 flex-1 overflow-hidden pt-px">
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
            <span className="hidden shrink-0 pt-0.5 text-xs text-app-subtle sm:inline">
              {formatDayNoteLabel(dateKey)}
            </span>
          </Link>
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMenuOpen((isOpen) => !isOpen)}
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
                <Link
                  to={href}
                  state={{ from }}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-app hover:bg-app-surface-muted"
                >
                  Открыть
                </Link>
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
