export type RecurrenceValue = "never" | "daily" | "weekly" | "monthly";

export const RECURRENCE_OPTIONS: { value: RecurrenceValue; label: string }[] = [
  { value: "never", label: "Не повторять" },
  { value: "daily", label: "Ежедневно" },
  { value: "weekly", label: "Еженедельно" },
  { value: "monthly", label: "Ежемесячно" },
];

export function getRecurrenceLabel(value: string): string {
  return (
    RECURRENCE_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

export function isRecurring(value: string | undefined): value is RecurrenceValue {
  return value === "daily" || value === "weekly" || value === "monthly";
}

/** Следующая дата в серии повторов. */
export function nextDueDate(current: Date, recurrence: RecurrenceValue): Date {
  const next = new Date(current.getTime());
  if (recurrence === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (recurrence === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }
  const day = next.getDate();
  const hours = next.getHours();
  const minutes = next.getMinutes();
  const seconds = next.getSeconds();
  const ms = next.getMilliseconds();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));
  next.setHours(hours, minutes, seconds, ms);
  return next;
}
