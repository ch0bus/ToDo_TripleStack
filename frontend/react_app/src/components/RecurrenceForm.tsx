"use client";

interface RecurrenceFormProps {
  value: string;
  onChange: (value: string) => void;
}

export function RecurrenceForm({ value, onChange }: RecurrenceFormProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
    >
      <option value="never">Не повторяется</option>
      <option value="daily">Каждый день</option>
      <option value="weekly">Каждую неделю</option>
      <option value="monthly">Каждый месяц</option>
    </select>
  );
}
