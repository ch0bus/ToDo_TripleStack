import { RECURRENCE_OPTIONS, type RecurrenceValue } from "@/lib/recurrence";
import { selectClassFull } from "@/lib/uiClasses";

interface RecurrenceSelectProps {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  id?: string;
}

export function RecurrenceSelect({ value, onChange, id }: RecurrenceSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as RecurrenceValue)}
      className={selectClassFull}
    >
      {RECURRENCE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
