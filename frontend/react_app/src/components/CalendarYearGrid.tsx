import {
  MONTH_LABELS_SHORT,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatMonthName,
  startOfMonth,
  type CalendarEntry,
} from "@/lib/calendar";
import { type DayNote } from "@/lib/dayNotes";
import { shiftDayFillStyle, type ShiftDay } from "@/lib/shifts";
import { isOverdue } from "@/lib/utils";

interface CalendarYearGridProps {
  year: number;
  today: Date;
  byDay: Map<string, CalendarEntry[]>;
  shiftsByDay: Map<string, ShiftDay>;
  notesByDay: Map<string, DayNote>;
  onSelectDate: (date: Date) => void;
}

export function CalendarYearGrid({
  year,
  today,
  byDay,
  shiftsByDay,
  notesByDay,
  onSelectDate,
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
              onClick={() => onSelectDate(monthDate)}
              className={
                "w-full px-2 py-1.5 text-left text-sm font-semibold hover:bg-app-surface-muted " +
                (isCurrentMonth ? "text-app-accent" : "text-app")
              }
            >
              {formatMonthName(monthDate)}
            </button>
            <div className="grid grid-cols-7 px-1 pb-1">
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
                const shift = shiftsByDay.get(cell.key);
                const note = notesByDay.get(cell.key);
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => onSelectDate(cell.date)}
                    className={
                      "relative flex h-6 items-center justify-center rounded-full text-[10px] " +
                      (cell.isToday
                        ? "bg-[var(--app-accent)] font-semibold text-white"
                        : cell.inMonth
                          ? "text-app hover:bg-app-surface-muted"
                          : "text-app-subtle/50") +
                      (note ? " calendar-day-note" : "")
                    }
                    style={shiftDayFillStyle(shift?.kind?.color)}
                  >
                    {cell.date.getDate()}
                    {hasTask && !cell.isToday && (
                      <span
                        className={
                          "absolute bottom-0.5 h-1 w-1 rounded-full " +
                          (overdue ? "bg-red-500" : "bg-[var(--app-accent)]")
                        }
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
