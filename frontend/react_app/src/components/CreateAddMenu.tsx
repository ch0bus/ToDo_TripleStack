import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { EventIcon } from "@/components/EventIcon";
import { dayNotePath } from "@/lib/dayNotes";
import { locationFrom, newEventPath, newTodoPath } from "@/lib/nav";

interface CreateAddMenuProps {
  day: string;
  hasNote?: boolean;
  attachDayToTodo?: boolean;
  className?: string;
}

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-surface-muted text-app-muted">
      {children}
    </span>
  );
}

function TaskGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" />
    </svg>
  );
}

function NoteGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-[var(--calendar-note-frame)]"
      aria-hidden
    >
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

export function CreateAddMenu({
  day,
  hasNote = false,
  attachDayToTodo = true,
  className = "",
}: CreateAddMenuProps) {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const from = locationFrom(location);
  const todoTo = newTodoPath(attachDayToTodo ? day : undefined);

  const items = [
    {
      to: todoTo,
      label: "Задача",
      hint: "Список и срок",
      icon: <TaskGlyph />,
    },
    {
      to: newEventPath(day),
      label: "Событие",
      hint: "Встреча или день в календаре",
      icon: <EventIcon />,
    },
    {
      to: dayNotePath(day),
      label: "Заметка",
      hint: hasNote ? "Открыть заметку дня" : "Одна на этот день",
      icon: <NoteGlyph />,
    },
  ];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={"relative min-w-0 w-full " + className}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Добавить задачу, событие или заметку"
        onClick={() => setOpen((value) => !value)}
        className={
          "btn-primary flex h-10 w-full items-center justify-center gap-1 rounded-md px-3 text-sm font-medium shadow-sm " +
          (open ? "opacity-95" : "")
        }
      >
        + Добавить
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={"h-4 w-4 opacity-80 " + (open ? "rotate-180" : "")}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Что добавить"
          className="absolute right-0 z-40 mt-1 w-64 rounded-xl border border-app bg-app-modal p-1 shadow-app"
        >
          {items.map((item) => (
            <Link
              key={item.to}
              role="menuitem"
              to={item.to}
              state={{ from }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-app-surface-muted"
            >
              <MenuIcon>{item.icon}</MenuIcon>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-app">
                  {item.label}
                </span>
                <span className="block text-xs text-app-subtle">{item.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
