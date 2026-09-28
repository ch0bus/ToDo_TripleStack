import {
  shiftCornerFillStyle,
  shiftDayFillStyle,
  shiftSolidFillStyle,
} from "@/lib/shifts";

interface MonthShiftFillProps {
  colors: [string | undefined, string | undefined];
  /** Оба слоя на календаре: каждый занимает свой угол, даже если второго нет. */
  splitCorners?: boolean;
  /** Год: сплошной цвет, без градиента. */
  solid?: boolean;
}

function LayerCorner({
  color,
  corner,
  solid = false,
}: {
  color: string | undefined;
  corner: 0 | 1;
  solid?: boolean;
}) {
  const fill = solid
    ? shiftSolidFillStyle(color, 0.55)
    : shiftCornerFillStyle(color, corner);
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
  solid = false,
}: MonthShiftFillProps) {
  const [first, second] = colors;
  if (splitCorners) {
    return (
      <>
        <LayerCorner color={first} corner={0} solid={solid} />
        <LayerCorner color={second} corner={1} solid={solid} />
      </>
    );
  }
  const only = first || second;
  if (!only) return null;
  const style = solid ? shiftSolidFillStyle(only, 0.45) : shiftDayFillStyle(only);
  if (!style) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={style}
    />
  );
}
