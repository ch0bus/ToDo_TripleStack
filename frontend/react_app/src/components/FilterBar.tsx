import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ChoiceChip } from "@/components/FormFields";
import { PriorityMark, StatusCycleIcon } from "@/components/TodoMarks";
import {
  PRIORITY_SELECT_OPTIONS,
  STATUS_SELECT_OPTIONS,
} from "@/lib/labels";

function FilterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M4 5h16l-6.5 8v5l-3 1.5v-6.5L4 5z" />
    </svg>
  );
}

export function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentPriority = searchParams.get("priority") ?? "";
  const active = Boolean(currentPriority);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    setSearchParams(params);
  }

  function toggleParam(name: string, value: string) {
    updateParam(name, (searchParams.get(name) ?? "") === value ? "" : value);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams);
    params.delete("priority");
    setSearchParams(params);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
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
        aria-haspopup="dialog"
        aria-label="Фильтр по приоритету"
        onClick={() => setOpen((value) => !value)}
        className={
          "relative flex h-10 w-10 items-center justify-center rounded-md border " +
          (active || open
            ? "border-app-strong bg-app-surface-muted text-app"
            : "border-app text-app-muted hover:bg-app-surface-muted hover:text-app")
        }
      >
        <FilterIcon />
        {active && (
          <span
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]"
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Приоритет"
          className="absolute left-0 z-40 mt-1 w-64 rounded-xl border border-app bg-app-modal p-3 shadow-app"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <PriorityMark priority={currentPriority} />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                Приоритет
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <ChoiceChip
                selected={!currentPriority}
                onClick={() => updateParam("priority", "")}
              >
                Все
              </ChoiceChip>
              {PRIORITY_SELECT_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.value}
                  selected={currentPriority === option.value}
                  onClick={() => toggleParam("priority", option.value)}
                >
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
          </div>

          {active && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs text-app-accent hover:underline"
            >
              Сбросить фильтр
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const currentStatus = searchParams.get("status") ?? "";
  const active = Boolean(currentStatus);

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === currentStatus) params.delete("status");
    else params.set("status", value);
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
        aria-haspopup="dialog"
        aria-label="Фильтр задач по статусу"
        onClick={() => setOpen((value) => !value)}
        className={
          "relative flex h-8 w-8 items-center justify-center rounded-md border " +
          (active || open
            ? "border-app-strong bg-app-surface-muted text-app"
            : "border-app text-app-muted hover:bg-app-surface-muted hover:text-app")
        }
      >
        <StatusCycleIcon status={currentStatus} className="h-4 w-4" />
        {active && (
          <span
            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]"
            aria-hidden
          />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Статус задач"
          className="absolute right-0 z-40 mt-1 w-56 rounded-xl border border-app bg-app-modal p-3 shadow-app"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
            Статус
          </p>
          <div className="flex flex-wrap gap-1">
            <ChoiceChip selected={!currentStatus} onClick={() => setStatus("")}>
              Все
            </ChoiceChip>
            {STATUS_SELECT_OPTIONS.filter((option) => option.value !== "done").map(
              (option) => (
                <ChoiceChip
                  key={option.value}
                  selected={currentStatus === option.value}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </ChoiceChip>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
