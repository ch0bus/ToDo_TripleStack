export interface ShiftKind {
  id: number;
  name: string;
  color: string;
}

export interface ShiftPatternSlot {
  position: number;
  kind_id: number | null;
  kind: ShiftKind | null;
}

export interface ShiftPattern {
  start_date: string | null;
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
