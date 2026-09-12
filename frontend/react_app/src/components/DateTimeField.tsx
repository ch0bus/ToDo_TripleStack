import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  WEEKDAY_LABELS,
  addMonths,
  buildMonthGrid,
  formatMonthTitle,
  startOfMonth,
  toDateKey,
} from "@/lib/calendar";
import { formatDueDateShort, formatTimeShort } from "@/lib/utils";

const POPOVER_WIDTH = 304;
const DEFAULT_HOUR = 18;
const DEFAULT_MINUTE = 0;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyDate(current: Date | null, nextDay: Date): Date {
  const next = new Date(nextDay);
  next.setHours(
    current?.getHours() ?? DEFAULT_HOUR,
    current?.getMinutes() ?? DEFAULT_MINUTE,
    0,
    0,
  );
  return next;
}

function applyTime(current: Date | null, hours: number, minutes: number): Date {
  const next = current ? new Date(current) : new Date();
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app"
    >
      {children}
    </button>
  );
}

function Stepper({
  value,
  label,
  onStep,
}: {
  value: number;
  label: string;
  onStep: (delta: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-app bg-app-input">
      <button
        type="button"
        aria-label={`${label} меньше`}
        onClick={() => onStep(-1)}
        className="h-9 w-8 text-app-muted hover:text-app"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums text-app">
        {pad(value)}
      </span>
      <button
        type="button"
        aria-label={`${label} больше`}
        onClick={() => onStep(1)}
        className="h-9 w-8 text-app-muted hover:text-app"
      >
        +
      </button>
    </div>
  );
}

interface DateTimeFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}

export function DateTimeField({
  id,
  value,
  onChange,
  emptyLabel = "Не выбрано",
}: DateTimeFieldProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const selected = parseValue(value);
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const selectedKey = selected ? toDateKey(selected) : null;
  const hours = selected?.getHours() ?? DEFAULT_HOUR;
  const minutes = selected?.getMinutes() ?? DEFAULT_MINUTE;

  function placePanel() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 420;
    const gap = 6;
    let left = rect.left;
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
    setMonth(startOfMonth(selected ?? new Date()));
    placePanel();
  }, [open]);

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

  function commit(date: Date) {
    onChange(toValue(date));
  }

  function pickDay(day: Date) {
    commit(applyDate(selected, day));
  }

  function stepHour(delta: number) {
    commit(applyTime(selected, (hours + delta + 24) % 24, minutes));
  }

  function stepMinute(delta: number) {
    const next = (minutes + delta * 5 + 60) % 60;
    commit(applyTime(selected, hours, next));
  }

  function pickToday() {
    const today = new Date();
    commit(applyDate(selected, today));
    setMonth(startOfMonth(today));
  }

  function clear() {
    onChange("");
    setOpen(false);
  }

  const summary = selected
    ? `${formatDueDateShort(toValue(selected))}, ${formatTimeShort(toValue(selected))}`
    : emptyLabel;

  return (
    <div>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
      >
        <span className="text-app-subtle">
          <CalendarIcon />
        </span>
        <span className={"min-w-0 flex-1 truncate " + (selected ? "text-app" : "text-app-subtle")}>
          {summary}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Выбор даты и времени"
            style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
            className="fixed z-[80] rounded-xl border border-app bg-app-modal p-3 shadow-app"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <NavButton
                  label="Предыдущий год"
                  onClick={() => setMonth(addMonths(month, -12))}
                >
                  «
                </NavButton>
                <NavButton
                  label="Предыдущий месяц"
                  onClick={() => setMonth(addMonths(month, -1))}
                >
                  ‹
                </NavButton>
              </div>
              <p className="text-sm font-medium capitalize text-app">
                {formatMonthTitle(month)}
              </p>
              <div className="flex items-center">
                <NavButton
                  label="Следующий месяц"
                  onClick={() => setMonth(addMonths(month, 1))}
                >
                  ›
                </NavButton>
                <NavButton
                  label="Следующий год"
                  onClick={() => setMonth(addMonths(month, 12))}
                >
                  »
                </NavButton>
              </div>
            </div>

            <div className="grid grid-cols-7">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="h-8 text-center text-[11px] font-medium text-app-subtle"
                >
                  {label}
                </div>
              ))}
              {cells.map((cell) => {
                const isSelected = cell.key === selectedKey;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => pickDay(cell.date)}
                    className={
                      "h-9 rounded-full text-sm " +
                      (isSelected
                        ? "bg-[var(--app-accent)] font-semibold text-white"
                        : cell.isToday
                          ? "font-semibold text-app-accent hover:bg-app-surface-muted"
                          : cell.inMonth
                            ? "text-app hover:bg-app-surface-muted"
                            : "text-app-subtle hover:bg-app-surface-muted")
                    }
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-app pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-app-subtle">
                Время
              </p>
              <div className="flex items-center gap-1.5">
                <Stepper value={hours} label="Часы" onStep={stepHour} />
                <span className="text-app-subtle">:</span>
                <Stepper value={minutes} label="Минуты" onStep={stepMinute} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={pickToday}
                  className="rounded-md px-2 py-1 text-xs text-app-accent hover:bg-app-surface-muted"
                >
                  Сегодня
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-md px-2 py-1 text-xs text-app-subtle hover:bg-app-surface-muted hover:text-app"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-app hover:bg-app-surface-muted"
              >
                Готово
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
