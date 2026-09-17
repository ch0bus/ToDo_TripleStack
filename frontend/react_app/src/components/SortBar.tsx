import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  TODO_SORT_OPTIONS,
  type TodoSort,
} from "@/lib/todoSort";

function SortIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
    </svg>
  );
}

export function SortBar({
  paramName = "sort",
  defaultSort,
  options = TODO_SORT_OPTIONS,
  label = "Сортировка списка",
}: {
  paramName?: string;
  defaultSort: string;
  options?: { value: string; label: string }[];
  label?: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allowed = options.map((option) => option.value);
  const raw = searchParams.get(paramName);
  const current =
    raw && allowed.includes(raw) ? raw : defaultSort;
  const active = current !== defaultSort;

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === defaultSort) params.delete(paramName);
    else params.set(paramName, value);
    setSearchParams(params);
  }

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
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className={
          "relative flex h-8 w-8 items-center justify-center rounded-md border " +
          (active || open
            ? "border-app-strong bg-app-surface-muted text-app"
            : "border-app text-app-muted hover:bg-app-surface-muted hover:text-app")
        }
      >
        <SortIcon />
        {active && (
          <span
            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]"
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-40 mt-1 w-52 rounded-xl border border-app bg-app-modal p-1 shadow-app"
        >
          {options.map((option) => {
            const selected = current === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setSort(option.value);
                  setOpen(false);
                }}
                className={
                  "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm " +
                  (selected
                    ? "bg-app-surface-muted text-app"
                    : "text-app-muted hover:bg-app-surface-muted hover:text-app")
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { TodoSort };
