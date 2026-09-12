/** Локальное значение `YYYY-MM-DDTHH:mm` из ISO строки API. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

/** Дата и время для паспорта задачи: «12 сентября, 11:20». */
export function formatDateStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfLocalDay(value: Date): number {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/** Разница календарных дней: >0 — срок впереди, <0 — уже прошёл. */
export function getCalendarDayDiff(value: string, now = new Date()): number | null {
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((startOfLocalDay(due) - startOfLocalDay(now)) / 86_400_000);
}

export function pluralRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(count) % 100;
  const digit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (digit === 1) return one;
  if (digit >= 2 && digit <= 4) return few;
  return many;
}

export function formatDueLabel(value: string, now = new Date()): string {
  const diff = getCalendarDayDiff(value, now);
  if (diff === null) return value;
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";

  const due = new Date(value);
  return due.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
}

/** Дата для календаря: событие, иначе срок. */
export function calendarAnchorIso(todo: {
  event_date?: string | null;
  due_date?: string | null;
}): string | null {
  return todo.event_date || todo.due_date || null;
}

/** Календарная дата срока: «12 сентября». */
export function formatDueDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

/** Время события: «18:00». */
export function formatTimeShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Срок для списка: сколько дней осталось или уже просрочено. */
export function formatDueCountdown(
  value: string,
  status: string,
  now = new Date(),
): string {
  if (status === "done") return formatDueLabel(value, now);

  const diff = getCalendarDayDiff(value, now);
  if (diff === null) return value;

  const daysWord = pluralRu(Math.abs(diff), "день", "дня", "дней");
  if (diff < 0) return `просрочено ${Math.abs(diff)} ${daysWord}`;
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  return `через ${diff} ${daysWord}`;
}

/** Дата события для списка: как срок, но без «просрочено». */
export function formatEventCountdown(
  value: string,
  status: string,
  now = new Date(),
): string {
  if (status === "done") return formatDueLabel(value, now);

  const diff = getCalendarDayDiff(value, now);
  if (diff === null) return value;
  if (diff < 0) return formatDueDateShort(value);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  return `через ${diff} ${pluralRu(diff, "день", "дня", "дней")}`;
}

/** Цвет вертикальной полоски на карточке задачи. */
export function getPriorityStripeClass(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-amber-400";
    case "low":
      return "bg-slate-400";
    default:
      return "bg-slate-500";
  }
}

export function getPriorityBorderClass(priority: string): string {
  switch (priority) {
    case "critical":
      return "priority-frame-critical";
    case "high":
      return "priority-frame-high";
    case "medium":
      return "priority-frame-medium";
    case "low":
      return "priority-frame-low";
    default:
      return "border-app";
  }
}

/** Просрочена: срок на прошедший календарный день, задача не выполнена. */
export function isOverdue(
  dueDate: string | null | undefined,
  status: string,
  now = new Date(),
): boolean {
  if (!dueDate || status === "done") return false;
  const diff = getCalendarDayDiff(dueDate, now);
  return diff !== null && diff < 0;
}
