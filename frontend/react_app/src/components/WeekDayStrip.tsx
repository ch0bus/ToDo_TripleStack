import { TodayHalo } from "@/components/CalendarNoteMarks";
import {
  WEEKDAY_LABELS,
  addDays,
  formatWeekStripLabel,
  startOfWeek,
  toDateKey,
  weekDates,
} from "@/lib/calendar";

interface WeekDayStripProps {
  selected: Date;
  today?: Date;
  busyDays?: ReadonlySet<string>;
  onSelect: (date: Date) => void;
}

function TodayJumpButton({
  disabled,
  className,
  onClick,
}: {
  disabled: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "shrink-0 rounded-md px-2 py-1 text-sm text-app-accent hover:bg-app-surface-muted disabled:cursor-default disabled:text-app-subtle disabled:hover:bg-transparent " +
        className
      }
    >
      Сегодня
    </button>
  );
}

export function WeekDayStrip({
  selected,
  today = new Date(),
  busyDays,
  onSelect,
}: WeekDayStripProps) {
  const weekStart = startOfWeek(selected);
  const days = weekDates(weekStart);
  const todayKey = toDateKey(today);
  const selectedKey = toDateKey(selected);
  const label = formatWeekStripLabel(weekStart);
  const onToday = selectedKey === todayKey;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center justify-between gap-1 sm:shrink-0 sm:justify-start">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onSelect(addDays(selected, -7))}
            className="shrink-0 rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
            aria-label="Предыдущая неделя"
          >
            ←
          </button>
          <p className="min-w-[7.5rem] px-1 py-1 text-sm font-medium text-app sm:text-center">
            {label}
          </p>
          <button
            type="button"
            onClick={() => onSelect(addDays(selected, 7))}
            className="shrink-0 rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
            aria-label="Следующая неделя"
          >
            →
          </button>
        </div>
        <TodayJumpButton
          disabled={onToday}
          className="sm:hidden"
          onClick={() => onSelect(today)}
        />
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-7">
        {days.map((date, index) => {
          const key = toDateKey(date);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const busy = busyDays?.has(key) ?? false;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={
                WEEKDAY_LABELS[index] +
                " " +
                date.getDate() +
                (busy ? ", есть задачи или события" : "")
              }
              className={
                "flex flex-col items-center gap-0.5 rounded-lg py-1 text-center hover:bg-app-surface-muted " +
                (isSelected ? "bg-[var(--app-accent-soft)]" : "")
              }
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-app-muted sm:text-xs">
                {WEEKDAY_LABELS[index]}
              </span>
              <span className="relative inline-flex h-8 w-8 items-center justify-center">
                {isToday ? <TodayHalo size={32} /> : null}
                <span
                  className={
                    "relative text-sm " +
                    (isSelected
                      ? "font-semibold text-app-accent"
                      : isToday
                        ? "font-semibold text-app"
                        : "text-app")
                  }
                >
                  {date.getDate()}
                </span>
              </span>
              <span
                className={
                  "h-1 w-1 rounded-full " +
                  (busy ? "bg-[var(--app-accent)]" : "bg-transparent")
                }
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <TodayJumpButton
        disabled={onToday}
        className="hidden sm:block"
        onClick={() => onSelect(today)}
      />
    </div>
  );
}
