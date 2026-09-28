import {
  shiftCornerFillStyle,
  shiftDayFillStyle,
} from "@/lib/shifts";

interface MonthShiftFillProps {
  colors: [string | undefined, string | undefined];
  /** Оба слоя на календаре: каждый занимает свой угол, даже если второго нет. */
  splitCorners?: boolean;
}

function LayerCorner({
  color,
  corner,
}: {
  color: string | undefined;
  corner: 0 | 1;
}) {
  const fill = shiftCornerFillStyle(color, corner);
  if (!fill) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        clipPath:
          corner === 0
            ? "polygon(0 0, 100% 0, 0 100%)"
            : "polygon(100% 0, 100% 100%, 0 100%)",
        ...fill,
      }}
    />
  );
}

/** Месяц: при двух видимых слоях — углы; иначе заливка всей клетки. */
export function MonthShiftFill({
  colors,
  splitCorners = false,
}: MonthShiftFillProps) {
  const [first, second] = colors;
  if (splitCorners) {
    return (
      <>
        <LayerCorner color={first} corner={0} />
        <LayerCorner color={second} corner={1} />
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
