import { CALENDAR_VIEW_OPTIONS, type CalendarView } from "@/lib/calendar";

export function CalendarViewSwitch({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Вид календаря"
      className="flex gap-1 overflow-x-auto border-b border-app"
    >
      {CALENDAR_VIEW_OPTIONS.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={
              "shrink-0 border-b-2 px-3 py-2 text-sm transition-colors " +
              (active
                ? "-mb-px border-[var(--app-accent)] font-medium text-app"
                : "border-transparent text-app-muted hover:text-app")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
