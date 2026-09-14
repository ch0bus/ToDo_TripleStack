import type { CSSProperties } from "react";

export interface ShiftCalendar {
  id: number;
  name: string;
  created_at: string;
}

export interface ShiftLayer {
  id: number;
  position: number;
  name: string;
}

export interface ShiftKind {
  id: number;
  layer_id: number;
  name: string;
  color: string;
  duration_hours: string | number;
  break_minutes: number;
  hourly_rate: string | number;
}

export interface ShiftKindWrite {
  layer_id: number;
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
  layer_id: number | null;
  start_date: string | null;
  end_date: string | null;
  slots: ShiftPatternSlot[];
}

export interface ShiftDay {
  date: string;
  layer_id: number;
  kind: ShiftKind | null;
  source: "pattern" | "override";
}

export type DayShiftMarks = [ShiftDay | undefined, ShiftDay | undefined];

export type PaintTool =
  | { type: "select" }
  | { type: "kind"; id: number }
  | { type: "off" }
  | { type: "pattern" };

export interface ShiftTotals {
  hours: number;
  pay: number;
}

export const SHIFT_CALENDAR_MAX = 10;

export function nextShiftCalendarName(existing: ShiftCalendar[]): string {
  const names = new Set(existing.map((row) => row.name));
  for (let index = 2; index <= SHIFT_CALENDAR_MAX + 5; index += 1) {
    const name = `Календарь ${index}`;
    if (!names.has(name)) return name;
  }
  return "Календарь";
}

export function emptyPattern(layerId: number | null = null): ShiftPattern {
  return { layer_id: layerId, start_date: null, end_date: null, slots: [] };
}

export function shiftMarksByDate(
  days: ShiftDay[],
  layers: ShiftLayer[],
): Map<string, DayShiftMarks> {
  const posById = new Map(layers.map((layer) => [layer.id, layer.position]));
  const map = new Map<string, DayShiftMarks>();
  for (const day of days) {
    const position = posById.get(day.layer_id);
    if (position !== 0 && position !== 1) continue;
    const current = map.get(day.date) ?? [undefined, undefined];
    current[position] = day;
    map.set(day.date, current);
  }
  return map;
}

export function markColors(
  marks: DayShiftMarks | undefined,
): [string | undefined, string | undefined] {
  return [marks?.[0]?.kind?.color, marks?.[1]?.kind?.color];
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function hexRgba(color: string | undefined, alpha: number): string | undefined {
  if (!color || !isHexColor(color)) return undefined;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
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
  layerId?: number,
): ShiftTotals {
  let hours = 0;
  let pay = 0;
  for (const day of days) {
    if (layerId != null && day.layer_id !== layerId) continue;
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
  const fill = hexRgba(color, 0.38);
  const mid = hexRgba(color, 0.14);
  const end = hexRgba(color, 0.03);
  if (!fill || !mid || !end) return undefined;
  return {
    backgroundImage: `linear-gradient(165deg, ${fill} 0%, ${mid} 52%, ${end} 100%)`,
  };
}

/** Кружок года: диагональный разрез без градиента. */
export function yearShiftSplitStyle(
  colors: [string | undefined, string | undefined],
): CSSProperties | undefined {
  const a = hexRgba(colors[0], 0.5);
  const b = hexRgba(colors[1], 0.5);
  if (a && b) {
    return {
      backgroundImage: `linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`,
    };
  }
  if (a || b) {
    return { backgroundColor: a || b };
  }
  return undefined;
}
