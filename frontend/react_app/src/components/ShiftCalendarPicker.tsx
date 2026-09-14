import { selectClass } from "@/lib/uiClasses";
import { SHIFT_CALENDAR_MAX, type ShiftCalendar } from "@/lib/shifts";

interface ShiftCalendarPickerProps {
  calendars: ShiftCalendar[];
  value: number | null;
  onChange: (id: number) => void;
  onCreate: () => void;
  className?: string;
}

export function ShiftCalendarPicker({
  calendars,
  value,
  onChange,
  onCreate,
  className = "",
}: ShiftCalendarPickerProps) {
  const canCreate = calendars.length < SHIFT_CALENDAR_MAX;
  return (
    <div className={"flex min-w-0 items-center gap-1.5 " + className}>
      <label className="sr-only" htmlFor="shift-calendar-select">
        Календарь смен
      </label>
      <select
        id="shift-calendar-select"
        value={value ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className={selectClass + " h-10 min-w-0 flex-1 py-1.5 md:w-44 md:flex-none"}
      >
        {calendars.map((calendar) => (
          <option key={calendar.id} value={calendar.id}>
            {calendar.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canCreate}
        onClick={onCreate}
        title={
          canCreate
            ? "Создать календарь смен"
            : `Не больше ${SHIFT_CALENDAR_MAX} календарей`
        }
        aria-label="Создать календарь смен"
        className="h-10 shrink-0 rounded-md border border-app px-3 text-lg leading-none text-app-muted hover:bg-app-surface-muted hover:text-app disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
