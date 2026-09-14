import { shiftDayFillStyle } from "@/lib/shifts";

interface MonthShiftFillProps {
  colors: [string | undefined, string | undefined];
}

/** Месяц: полный градиент или два треугольника, если заняты оба слоя. */
export function MonthShiftFill({ colors }: MonthShiftFillProps) {
  const [first, second] = colors;
  if (first && second) {
    return (
      <>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
            ...shiftDayFillStyle(first),
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            ...shiftDayFillStyle(second),
          }}
        />
      </>
    );
  }
  const only = first || second;
  if (!only) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={shiftDayFillStyle(only)}
    />
  );
}
