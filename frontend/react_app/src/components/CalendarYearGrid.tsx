import { YearNoteUnderline, YearTodayHalo } from "@/components/CalendarNoteMarks";
import {
  MONTH_LABELS_SHORT,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatMonthName,
  startOfMonth,
  type CalendarEntry,
} from "@/lib/calendar";
import { type DayNote } from "@/lib/dayNotes";
import { eventFlagColors, type EventEntry } from "@/lib/events";
import {
  markColors,
  yearShiftSplitStyle,
  type DayShiftMarks,
} from "@/lib/shifts";
import { isOverdue } from "@/lib/utils";

interface CalendarYearGridProps {
  year: number;
  today: Date;
  selectedKey: string;
  byDay: Map<string, CalendarEntry[]>;
  eventsByDay: Map<string, EventEntry[]>;
  marksByDay: Map<string, DayShiftMarks>;
  notesByDay: Map<string, DayNote>;
  onSelectMonth: (date: Date) => void;
  onSelectDay: (date: Date) => void;
}

export function CalendarYearGrid({
  year,
  today,
  selectedKey,
  byDay,
  eventsByDay,
  marksByDay,
  notesByDay,
  onSelectMonth,
  onSelectDay,
}: CalendarYearGridProps) {
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {MONTH_LABELS_SHORT.map((_, monthIndex) => {
        const monthDate = startOfMonth(new Date(year, monthIndex, 1));
        const cells = buildMonthGrid(monthDate, today);
        const isCurrentMonth =
          year === currentYear && monthIndex === currentMonth;
        return (
          <section
            key={monthIndex}
            className="overflow-hidden rounded-xl border border-app bg-app-surface"
          >
            <button
              type="button"
              onClick={() => onSelectMonth(monthDate)}
              className={
                "w-full px-2 py-1.5 text-left text-sm font-semibold hover:bg-app-surface-muted " +
                (isCurrentMonth ? "text-app-accent" : "text-app")
              }
            >
              {formatMonthName(monthDate)}
            </button>
            <div className="grid grid-cols-7 px-1.5 pb-1.5">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="h-5 text-center text-[9px] font-medium uppercase text-app-subtle"
                >
                  {label.charAt(0)}
                </div>
              ))}
              {cells.map((cell) => {
                const entries = byDay.get(cell.key) ?? [];
                const hasTask = entries.some((entry) => !entry.virtual);
                const overdue = entries.some(
                  (entry) =>
                    !entry.virtual &&
                    isOverdue(entry.todo.due_date, entry.todo.status),
                );
                const eventColor = eventFlagColors(
                  eventsByDay.get(cell.key) ?? [],
                  1,
                )[0];
                const note = notesByDay.get(cell.key);
                const selected = cell.key === selectedKey;
                return (
                  <div key={cell.key} className="relative">
                    {cell.isToday ? <YearTodayHalo /> : null}
                    <button
                      type="button"
                      onClick={() => onSelectDay(cell.date)}
                      className={
                        "relative z-[1] flex h-8 w-full items-center justify-center overflow-hidden rounded-full text-[10px] " +
                        (cell.isToday
                          ? selected
                            ? "font-semibold text-app-accent"
                            : "font-semibold text-app"
                          : selected
                            ? "bg-[var(--app-accent-soft)] font-semibold text-app-accent"
                            : cell.inMonth
                              ? "text-app hover:bg-app-surface-muted"
                              : "text-app-subtle/50")
                      }
                      style={yearShiftSplitStyle(
                        markColors(marksByDay.get(cell.key)),
                      )}
                    >
                      {cell.date.getDate()}
                      {hasTask ? (
                        <span
                          className={
                            "absolute bottom-0 h-1 w-1 rounded-full " +
                            (overdue ? "bg-red-500" : "bg-[var(--app-accent)]")
                          }
                        />
                      ) : null}
                    </button>
                    {note ? <YearNoteUnderline /> : null}
                    {eventColor && (
                      <span
                        className="pointer-events-none absolute right-0 top-0 z-[1] h-1.5 w-1.5 rounded-[1px] shadow-sm"
                        style={{ backgroundColor: eventColor }}
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
