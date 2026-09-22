import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { EventIcon } from "@/components/EventIcon";
import { toDateKey, type CalendarEntry } from "@/lib/calendar";
import {
  GRID_HOURS,
  HOUR_HEIGHT,
  allDayEventEntries,
  allDayTodoEntries,
  blockHeight,
  blockTop,
  formatDayColumnLabel,
  formatHourLabel,
  layoutTimedBlocks,
  minutesFromMidnight,
  timedBlocksForDay,
} from "@/lib/calendarTime";
import { dayNotePath, type DayNote } from "@/lib/dayNotes";
import type { EventEntry } from "@/lib/events";
import { eventPath, locationFrom } from "@/lib/nav";
import type { DayShiftMarks, ShiftLayer } from "@/lib/shifts";

interface CalendarTimeGridProps {
  days: Date[];
  today: Date;
  selectedKey: string;
  eventsByDay: Map<string, EventEntry[]>;
  todosByDay: Map<string, CalendarEntry[]>;
  notesByDay: Map<string, DayNote>;
  shiftsByDay: Map<string, DayShiftMarks>;
  shiftLayers: ShiftLayer[];
  onSelectDay: (date: Date) => void;
}

function contrastText(color: string): string {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return "#fff";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 160 ? "#111" : "#fff";
}

export function CalendarTimeGrid({
  days,
  today,
  selectedKey,
  eventsByDay,
  todosByDay,
  notesByDay,
  shiftsByDay,
  shiftLayers,
  onSelectDay,
}: CalendarTimeGridProps) {
  const location = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const todayKey = toDateKey(today);
  const from = locationFrom(location);
  const multi = days.length > 1;
  const columns = `3.25rem repeat(${days.length}, minmax(${multi ? "9.5rem" : "0"}, 1fr))`;
  const minWidth = multi ? `calc(3.25rem + ${days.length} * 9.5rem)` : undefined;
  const gridStyle = { gridTemplateColumns: columns };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const daysKey = days.map((date) => toDateKey(date)).join(",");

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const hasToday = daysKey.split(",").includes(todayKey);
    const minutes = hasToday ? minutesFromMidnight(new Date()) : 7 * 60;
    node.scrollTop = Math.max(0, (minutes / 60) * HOUR_HEIGHT - HOUR_HEIGHT);
  }, [daysKey, todayKey]);

  return (
    <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
      <div
        ref={scrollerRef}
        className="max-h-[min(36rem,70vh)] overflow-auto"
      >
        <div className="w-full" style={{ minWidth }}>
          <div className="sticky top-0 z-20 bg-app-surface shadow-[0_1px_0_var(--app-border)]">
            <div className="grid" style={gridStyle}>
              <div className="sticky left-0 z-30 border-b border-app bg-app-surface-muted/70" />
              {days.map((date) => {
                const key = toDateKey(date);
                const selected = key === selectedKey;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectDay(date)}
                    className={
                      "border-b border-l border-app px-1 py-2 text-center text-xs font-medium " +
                      (selected
                        ? "bg-[var(--app-accent-soft)] font-semibold text-app-accent"
                        : isToday
                          ? "font-semibold text-app"
                          : "bg-app-surface text-app-muted hover:bg-app-surface-muted")
                    }
                  >
                    {formatDayColumnLabel(date)}
                  </button>
                );
              })}
            </div>
            <div className="grid" style={gridStyle}>
              <div className="sticky left-0 z-30 border-b border-app bg-app-surface px-1 py-1 text-[10px] uppercase leading-tight tracking-wide text-app-subtle">
                Весь день
              </div>
              {days.map((date) => {
                const key = toDateKey(date);
                const allDay = allDayEventEntries(eventsByDay.get(key) ?? []);
                const allDayTodos = allDayTodoEntries(todosByDay.get(key) ?? []);
                const note = notesByDay.get(key);
                const marks = shiftsByDay.get(key);
                return (
                  <div
                    key={`all-${key}`}
                    className="flex min-h-[3.25rem] flex-col gap-1 border-b border-l border-app bg-app-surface p-1"
                  >
                    {shiftLayers.map((layer, index) => {
                      const kind = marks?.[index as 0 | 1]?.kind;
                      if (!kind) return null;
                      return (
                        <span
                          key={layer.id}
                          className="truncate rounded px-1.5 py-0.5 text-[11px] text-white"
                          style={{ backgroundColor: kind.color }}
                          title={`${layer.name}: ${kind.name}`}
                        >
                          {kind.name}
                        </span>
                      );
                    })}
                    {note?.text ? (
                      <Link
                        to={dayNotePath(key)}
                        state={{ from }}
                        className="truncate rounded px-1.5 py-0.5 text-[11px] text-app"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--calendar-note-frame) 35%, transparent)",
                        }}
                      >
                        {note.text.split("\n")[0]}
                      </Link>
                    ) : null}
                    {allDay.map((entry) => (
                      <Link
                        key={`${entry.event.id}-${entry.occurrenceStartKey}`}
                        to={eventPath(entry.event.id)}
                        state={{ from }}
                        className="flex min-w-0 items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px]"
                        style={{
                          backgroundColor: entry.event.color,
                          color: contrastText(entry.event.color),
                        }}
                      >
                        <EventIcon
                          className="h-3 w-3 shrink-0"
                          attended={entry.attended}
                        />
                        <span className="min-w-0 truncate">{entry.event.title}</span>
                      </Link>
                    ))}
                    {allDayTodos.map((entry) => (
                      <Link
                        key={`todo-${entry.todo.id}-${entry.dateKey}`}
                        to={`/todos/${entry.todo.id}`}
                        state={{ from }}
                        className="truncate rounded bg-[var(--app-accent)] px-1.5 py-0.5 text-[11px] text-white"
                      >
                        {entry.todo.title}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid" style={gridStyle}>
            <div
              className="sticky left-0 z-10 bg-app-surface"
              style={{ height: GRID_HOURS * HOUR_HEIGHT }}
            >
              {Array.from({ length: GRID_HOURS }, (_, hour) => (
                <div
                  key={hour}
                  className="absolute right-1 -translate-y-2 text-[10px] tabular-nums text-app-subtle"
                  style={{ top: hour * HOUR_HEIGHT }}
                >
                  {hour === 0 ? "" : formatHourLabel(hour)}
                </div>
              ))}
            </div>
            {days.map((date) => {
              const key = toDateKey(date);
              const blocks = layoutTimedBlocks(
                timedBlocksForDay(
                  eventsByDay.get(key) ?? [],
                  todosByDay.get(key) ?? [],
                  key,
                ),
              );
              const isToday = key === todayKey;
              const nowMin = minutesFromMidnight(now);
              return (
                <div
                  key={`grid-${key}`}
                  className="relative border-l border-app"
                  style={{ height: GRID_HOURS * HOUR_HEIGHT }}
                >
                  {Array.from({ length: GRID_HOURS }, (_, hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-app"
                      style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}
                  {blocks.map((block) => {
                    const width = 100 / block.colCount;
                    return (
                      <Link
                        key={block.key}
                        to={block.to}
                        state={{ from }}
                        title={block.title}
                        className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-snug shadow-sm"
                        style={{
                          top: blockTop(block.startMin),
                          height: blockHeight(block.startMin, block.endMin),
                          left: `calc(${block.col * width}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          backgroundColor: block.color,
                          color: contrastText(block.color),
                        }}
                      >
                        <span className="flex min-w-0 items-start gap-1">
                          {block.kind === "event" ? (
                            <EventIcon
                              className="mt-px h-3 w-3 shrink-0"
                              attended={block.attended}
                            />
                          ) : null}
                          <span className="line-clamp-2 font-medium">
                            {block.title}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                  {isToday ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-[1] border-t-2 border-[var(--app-danger)]"
                      style={{ top: blockTop(nowMin) }}
                    >
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[var(--app-danger)]" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
