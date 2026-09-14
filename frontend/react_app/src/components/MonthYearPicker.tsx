import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  MONTH_LABELS_SHORT,
  formatMonthTitle,
  formatYearTitle,
  startOfMonth,
} from "@/lib/calendar";

const POPOVER_WIDTH = 280;
const MIN_YEAR = 1;
const MAX_YEAR = 9999;

function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
}

function parseYear(raw: string): number | null {
  if (!/^\d{1,4}$/.test(raw)) return null;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return null;
  return year;
}

interface MonthYearPickerProps {
  value: Date;
  mode?: "month" | "year";
  onChange: (month: Date) => void;
  onToday: () => void;
}

export function MonthYearPicker({
  value,
  mode = "month",
  onChange,
  onToday,
}: MonthYearPickerProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [yearDraft, setYearDraft] = useState(String(value.getFullYear()));
  const selectedMonth = value.getMonth();
  const selectedYear = value.getFullYear();
  const today = useMemo(() => new Date(), []);

  function showYear(year: number) {
    const next = clampYear(year);
    setViewYear(next);
    setYearDraft(String(next));
  }

  function commitYearDraft() {
    const parsed = parseYear(yearDraft);
    if (parsed == null) {
      setYearDraft(String(viewYear));
      return;
    }
    showYear(parsed);
  }

  function placePanel() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 260;
    const gap = 6;
    let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    if (left + POPOVER_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - POPOVER_WIDTH - 8;
    }
    if (left < 8) left = 8;
    let top = rect.bottom + gap;
    if (top + panelHeight > window.innerHeight - 8) {
      top = rect.top - panelHeight - gap;
    }
    if (top < 8) top = 8;
    setCoords({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    showYear(value.getFullYear());
    placePanel();
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    placePanel();
    function onReposition() {
      placePanel();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function applyYear(year: number) {
    const next = clampYear(year);
    showYear(next);
    onChange(startOfMonth(new Date(next, value.getMonth(), 1)));
  }

  function pickMonth(monthIndex: number) {
    const year = parseYear(yearDraft) ?? viewYear;
    showYear(year);
    onChange(startOfMonth(new Date(year, monthIndex, 1)));
    setOpen(false);
  }

  function handleToday() {
    onToday();
    setOpen(false);
  }

  function handleCurrentYear() {
    applyYear(today.getFullYear());
    setOpen(false);
  }

  return (
    <div className="min-w-0">
      <h1 className="m-0 min-w-0">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="flex max-w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-lg font-semibold text-app hover:bg-app-surface-muted sm:text-xl"
        >
          <span className="truncate">
            {mode === "year" ? formatYearTitle(value) : formatMonthTitle(value)}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={
              "h-4 w-4 shrink-0 text-app-muted transition-transform " +
              (open ? "rotate-180" : "")
            }
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h1>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={mode === "year" ? "Выбор года" : "Выбор месяца и года"}
            style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
            className="fixed z-[80] rounded-xl border border-app bg-app-modal p-3 shadow-app"
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                aria-label="Предыдущий год"
                onClick={() =>
                  mode === "year" ? applyYear(viewYear - 1) : showYear(viewYear - 1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app"
              >
                ‹
              </button>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Год</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={yearDraft}
                  onChange={(e) => setYearDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={() => {
                    commitYearDraft();
                    if (mode === "year") {
                      const parsed = parseYear(yearDraft);
                      if (parsed != null) applyYear(parsed);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitYearDraft();
                      if (mode === "year") {
                        const parsed = parseYear(yearDraft);
                        if (parsed != null) {
                          applyYear(parsed);
                          setOpen(false);
                        }
                      }
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (mode === "year") applyYear(viewYear + 1);
                      else showYear(viewYear + 1);
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (mode === "year") applyYear(viewYear - 1);
                      else showYear(viewYear - 1);
                    }
                  }}
                  className="w-full rounded-md border border-app bg-app-input px-2 py-1.5 text-center text-sm font-medium tabular-nums text-app focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                />
              </label>
              <button
                type="button"
                aria-label="Следующий год"
                onClick={() =>
                  mode === "year" ? applyYear(viewYear + 1) : showYear(viewYear + 1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app"
              >
                ›
              </button>
            </div>

            {mode === "month" && (
              <div className="grid grid-cols-3 gap-1">
              {MONTH_LABELS_SHORT.map((label, monthIndex) => {
                const isSelected =
                  monthIndex === selectedMonth && viewYear === selectedYear;
                const isCurrent =
                  monthIndex === today.getMonth() &&
                  viewYear === today.getFullYear();
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => pickMonth(monthIndex)}
                    className={
                      "rounded-md px-2 py-2 text-sm " +
                      (isSelected
                        ? "bg-[var(--app-accent)] font-semibold text-white"
                        : isCurrent
                          ? "font-semibold text-app-accent hover:bg-app-surface-muted"
                          : "text-app hover:bg-app-surface-muted")
                    }
                  >
                    {label}
                  </button>
                );
              })}
              </div>
            )}

            <button
              type="button"
              onClick={mode === "year" ? handleCurrentYear : handleToday}
              className="mt-2 w-full rounded-md border border-app px-2 py-1.5 text-sm text-app-muted hover:bg-app-surface-muted hover:text-app"
            >
              {mode === "year" ? "Текущий год" : "Сегодня"}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
