import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { locationFrom, shiftSettingsPath } from "@/lib/nav";
import {
  formatShiftPayLine,
  formatShiftTotalsLine,
  type DayShiftMarks,
  type ShiftLayer,
  type ShiftTotals,
} from "@/lib/shifts";

function MoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function ShiftDaySummary({
  layers,
  marks,
  totals,
  periodLabel,
  calendarId,
  painting,
  onTogglePaint,
}: {
  layers: ShiftLayer[];
  marks: DayShiftMarks | undefined;
  totals: Array<{ layer: ShiftLayer; totals: ShiftTotals }>;
  periodLabel: (layer: ShiftLayer) => string;
  calendarId?: number | null;
  painting: boolean;
  onTogglePaint: () => void;
}) {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const from = locationFrom(location);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex items-start gap-3 bg-transparent">
      <div className="min-w-0 flex-1 space-y-1">
        {layers.map((layer, index) => {
          const mark = marks?.[index as 0 | 1];
          return (
            <p key={layer.id} className="text-sm text-app-muted">
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
            </p>
          );
        })}
        {totals.map(({ layer, totals: layerTotals }) => (
          <p key={`total-${layer.id}`} className="text-sm text-app-muted">
            {formatShiftTotalsLine(periodLabel(layer), layerTotals)}
          </p>
        ))}
      </div>

      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Действия со сменами"
          onClick={() => setOpen((value) => !value)}
          className={
            "rounded-md p-1.5 " +
            (painting || open
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
          }
        >
          <MoreIcon />
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Действия со сменами"
            className="absolute right-0 z-40 mt-1 w-56 rounded-xl border border-app bg-app-modal p-1 shadow-app"
          >
            <Link
              role="menuitem"
              to={shiftSettingsPath(calendarId)}
              state={{ from }}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-left hover:bg-app-surface-muted"
            >
              <span className="block text-sm font-medium text-app">
                Настройки смен
              </span>
              <span className="block text-xs text-app-subtle">
                Типы, слои и шаблон цикла
              </span>
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onTogglePaint();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left hover:bg-app-surface-muted"
            >
              <span className="block text-sm font-medium text-app">
                {painting ? "Скрыть кисть" : "Рисование"}
              </span>
              <span className="block text-xs text-app-subtle">
                {painting ? "Убрать кисть с календаря" : "Кисть сразу под календарём"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
