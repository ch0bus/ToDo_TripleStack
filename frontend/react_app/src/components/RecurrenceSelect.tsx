import { RECURRENCE_OPTIONS, type RecurrenceValue } from "@/lib/recurrence";
import { selectClassFull } from "@/lib/uiClasses";

interface RecurrenceSelectProps {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  id?: string;
  className?: string;
}

export function RecurrenceSelect({
  value,
  onChange,
  id,
  className,
}: RecurrenceSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as RecurrenceValue)}
      className={className ?? selectClassFull}
    >
      {RECURRENCE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
