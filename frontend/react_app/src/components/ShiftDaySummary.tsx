import { Link, useLocation } from "react-router-dom";

import { ShiftLayerEyeIcon } from "@/components/ShiftLayerEyeIcon";
import { locationFrom, shiftSettingsPath } from "@/lib/nav";
import {
  formatShiftPayLine,
  formatShiftTotalsLine,
  type DayShiftMarks,
  type ShiftLayer,
  type ShiftTotals,
} from "@/lib/shifts";

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M14.5 5.5 18.5 9.5" />
      <path d="M4 20c1.8 0 3-.8 4.2-2.2L17 8.9a2.3 2.3 0 0 0-3.2-3.2L4.9 14.6C3.6 16 3 17.3 3 19c0 .6.4 1 1 1Z" />
    </svg>
  );
}

const iconBtn =
  "shrink-0 rounded-md p-1.5 text-app-subtle hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]";

export function ShiftDaySummary({
  layers,
  marks,
  totals,
  periodLabel,
  calendarId,
  painting,
  onTogglePaint,
  hiddenLayerIds,
  onToggleLayerHidden,
}: {
  layers: ShiftLayer[];
  marks: DayShiftMarks | undefined;
  totals: Array<{ layer: ShiftLayer; totals: ShiftTotals }>;
  periodLabel: (layer: ShiftLayer) => string;
  calendarId?: number | null;
  painting?: boolean;
  onTogglePaint?: () => void;
  hiddenLayerIds?: ReadonlySet<number>;
  onToggleLayerHidden?: (id: number) => void;
}) {
  const location = useLocation();
  const from = locationFrom(location);

  return (
    <div className="flex items-start gap-3 bg-transparent">
      <div className="min-w-0 flex-1 space-y-1">
        {layers.map((layer, index) => {
          const mark = marks?.[index as 0 | 1];
          const hidden = hiddenLayerIds?.has(layer.id) ?? false;
          return (
            <p
              key={layer.id}
              className={
                "flex items-start gap-1.5 text-sm text-app-muted " +
                (hidden ? "opacity-50" : "")
              }
            >
              {onToggleLayerHidden ? (
                <button
                  type="button"
                  onClick={() => onToggleLayerHidden(layer.id)}
                  className="mt-0.5 shrink-0 rounded-md p-0.5 text-app-subtle hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                  aria-pressed={hidden}
                  aria-label={
                    hidden
                      ? `Показать слой «${layer.name}»`
                      : `Скрыть слой «${layer.name}»`
                  }
                  title={hidden ? "Показать слой на календаре" : "Скрыть слой на календаре"}
                >
                  <ShiftLayerEyeIcon hidden={hidden} />
                </button>
              ) : null}
              <span>
                <span className="text-app">{layer.name}: </span>
                {mark?.kind ? (
                  <>
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                      style={{ backgroundColor: mark.kind.color }}
                      aria-hidden
                    />
                    {mark.kind.name} · {formatShiftPayLine(mark.kind)}
                  </>
                ) : (
                  "нет смены"
                )}
              </span>
            </p>
          );
        })}
        {totals.map(({ layer, totals: layerTotals }) => (
          <p key={`total-${layer.id}`} className="text-sm text-app-muted">
            {formatShiftTotalsLine(periodLabel(layer), layerTotals)}
          </p>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Link
          to={shiftSettingsPath(calendarId)}
          state={{ from }}
          className={iconBtn}
          aria-label="Настройки смен"
          title="Настройки смен"
        >
          <GearIcon />
        </Link>
        {onTogglePaint ? (
          <button
            type="button"
            onClick={onTogglePaint}
            className={
              iconBtn + (painting ? " bg-app-surface-muted text-app" : "")
            }
            aria-pressed={painting}
            aria-label={painting ? "Скрыть кисть" : "Рисование"}
            title={painting ? "Убрать кисть с календаря" : "Рисование"}
          >
            <BrushIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}
