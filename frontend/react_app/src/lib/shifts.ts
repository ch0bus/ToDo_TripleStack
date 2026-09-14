export interface ShiftKind {
  id: number;
  name: string;
  color: string;
  duration_hours: string | number;
  break_minutes: number;
  hourly_rate: string | number;
}

export interface ShiftKindWrite {
  name: string;
  color: string;
  duration_hours: number;
  break_minutes: number;
  hourly_rate: number;
}

export interface ShiftPatternSlot {
  position: number;
  kind_id: number | null;
  kind: ShiftKind | null;
}

export interface ShiftPattern {
  start_date: string | null;
  end_date: string | null;
  slots: ShiftPatternSlot[];
}

export interface ShiftDay {
  date: string;
  kind: ShiftKind | null;
  source: "pattern" | "override";
}

export type PaintTool =
  | { type: "select" }
  | { type: "kind"; id: number }
  | { type: "off" }
  | { type: "pattern" };

export interface ShiftTotals {
  hours: number;
  pay: number;
}

export function shiftDaysMap(days: ShiftDay[]): Map<string, ShiftDay> {
  const map = new Map<string, ShiftDay>();
  for (const day of days) {
    map.set(day.date, day);
  }
  return map;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function kindHours(kind: ShiftKind): number {
  const n = Number(kind.duration_hours);
  return Number.isFinite(n) ? n : 0;
}

export function kindRate(kind: ShiftKind): number {
  const n = Number(kind.hourly_rate);
  return Number.isFinite(n) ? n : 0;
}

export function paidHours(kind: ShiftKind | null | undefined): number {
  if (!kind) return 0;
  return Math.max(0, kindHours(kind) - (kind.break_minutes || 0) / 60);
}

export function shiftPay(kind: ShiftKind | null | undefined): number {
  if (!kind) return 0;
  return paidHours(kind) * kindRate(kind);
}

export function summarizeShiftDays(
  days: ShiftDay[],
  from: string,
  to: string,
): ShiftTotals {
  let hours = 0;
  let pay = 0;
  for (const day of days) {
    if (day.date < from || day.date > to || !day.kind) continue;
    hours += paidHours(day.kind);
    pay += shiftPay(day.kind);
  }
  return { hours, pay };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.round(value * 100) / 100);
}

export function formatHours(hours: number): string {
  return `${formatNumber(hours)} ч`;
}

export function formatRub(amount: number): string {
  return `${formatNumber(amount)} ₽`;
}

export function formatKindMeta(kind: ShiftKind): string {
  const parts = [
    formatHours(kindHours(kind)),
    kind.break_minutes ? `${kind.break_minutes} мин` : null,
    `${formatNumber(kindRate(kind))} ₽/ч`,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function formatShiftPayLine(kind: ShiftKind): string {
  const parts = [
    formatHours(kindHours(kind)),
    kind.break_minutes ? `перерыв ${kind.break_minutes} мин` : null,
    formatRub(shiftPay(kind)),
  ];
  return parts.filter(Boolean).join(" · ");
}

export function formatShiftTotalsLine(label: string, totals: ShiftTotals): string {
  return `${label}: ${formatHours(totals.hours)} · ${formatRub(totals.pay)}`;
}

/** Мягкая заливка дня календаря цветом смены. */
export function shiftDayFillStyle(
  color: string | undefined,
): { backgroundImage: string } | undefined {
  if (!color || !isHexColor(color)) return undefined;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return {
    backgroundImage: `linear-gradient(165deg, rgb(${r} ${g} ${b} / 0.38) 0%, rgb(${r} ${g} ${b} / 0.14) 52%, rgb(${r} ${g} ${b} / 0.03) 100%)`,
  };
}
