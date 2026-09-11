import { RECURRENCE_OPTIONS, type RecurrenceValue } from "@/lib/recurrence";

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
      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
    >
      {RECURRENCE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
