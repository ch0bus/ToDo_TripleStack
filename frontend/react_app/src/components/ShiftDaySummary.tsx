import { useEffect, useId, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { ShiftLayerEyeIcon } from "@/components/ShiftLayerEyeIcon";
import { locationFrom, shiftSettingsPath } from "@/lib/nav";
import {
  bonusAmount,
  dayDurationHours,
  formatHours,
  formatRub,
  formatShiftTotalsLine,
  shiftPay,
  type DayShiftMarks,
  type ShiftBonus,
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        "h-4 w-4 shrink-0 text-app-subtle transition-transform " +
        (open ? "rotate-180" : "")
      }
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShiftKindChips({
  layers,
  marks,
}: {
  layers: ShiftLayer[];
  marks: DayShiftMarks | undefined;
}) {
  const kinds = layers
    .map((layer, index) => marks?.[index as 0 | 1]?.kind)
    .filter((kind): kind is NonNullable<typeof kind> => Boolean(kind));
  if (!kinds.length) {
    return <span className="text-sm text-app-subtle">нет смены</span>;
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {kinds.map((kind) => (
        <span
          key={kind.id}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-app"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: kind.color }}
            aria-hidden
          />
          <span className="truncate">{kind.name}</span>
        </span>
      ))}
    </span>
  );
}

export function ShiftDaySummary({
  title,
  dateKey,
  layers,
  marks,
  totals,
  periodLabel,
  calendarId,
  painting,
  onTogglePaint,
  hiddenLayerIds,
  onToggleLayerHidden,
  dayBonuses,
  onEditBonus,
  onEditHours,
}: {
  title: ReactNode;
  dateKey: string;
  layers: ShiftLayer[];
  marks: DayShiftMarks | undefined;
  totals: Array<{ layer: ShiftLayer; totals: ShiftTotals; bonus: number }>;
  periodLabel: (layer: ShiftLayer) => string;
  calendarId?: number | null;
  painting?: boolean;
  onTogglePaint?: () => void;
  hiddenLayerIds?: ReadonlySet<number>;
  onToggleLayerHidden?: (id: number) => void;
  dayBonuses?: ReadonlyMap<number, ShiftBonus>;
  onEditBonus?: (layerId: number) => void;
  onEditHours?: (layerId: number) => void;
}) {
  const location = useLocation();
  const from = locationFrom(location);
  const detailsId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [dateKey]);

  if (!layers.length) {
    return (
      <h2 className="text-lg font-semibold capitalize text-app">{title}</h2>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md py-0.5 text-left hover:bg-app-surface-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
      >
        <h2 className="min-w-0 text-lg font-semibold capitalize text-app">
          {title}
        </h2>
        <span className="flex min-w-0 items-center gap-2">
          <ShiftKindChips layers={layers} marks={marks} />
          <ChevronIcon open={open} />
        </span>
      </button>

      {open ? (
        <div id={detailsId} className="flex items-start gap-3 bg-transparent">
          <div className="min-w-0 flex-1 space-y-1">
            {layers.map((layer, index) => {
              const mark = marks?.[index as 0 | 1];
              const hidden = hiddenLayerIds?.has(layer.id) ?? false;
              const layerBonus = dayBonuses?.get(layer.id);
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
                      title={
                        hidden
                          ? "Показать слой на календаре"
                          : "Скрыть слой на календаре"
                      }
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
                        {mark.kind.name}
                        {" · "}
                        {onEditHours ? (
                          <button
                            type="button"
                            onClick={() => onEditHours(layer.id)}
                            className="rounded-sm text-app underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                            title="Изменить часы в этот день"
                            aria-label={`Изменить часы слоя «${layer.name}»`}
                          >
                            {formatHours(dayDurationHours(mark))}
                          </button>
                        ) : (
                          formatHours(dayDurationHours(mark))
                        )}
                        {mark.kind.break_minutes
                          ? ` · перерыв ${mark.kind.break_minutes} мин`
                          : ""}
                        {" · "}
                        {formatRub(
                          shiftPay(mark.kind, dayDurationHours(mark)),
                        )}
                      </>
                    ) : (
                      "нет смены"
                    )}
                    {layerBonus ? (
                      <>
                        {" · "}
                        {onEditBonus ? (
                          <button
                            type="button"
                            onClick={() => onEditBonus(layer.id)}
                            className="rounded-sm text-app underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                            title="Изменить доплату"
                            aria-label={`Изменить доплату слоя «${layer.name}»`}
                          >
                            доплата {formatRub(bonusAmount(layerBonus))}
                          </button>
                        ) : (
                          <>доплата {formatRub(bonusAmount(layerBonus))}</>
                        )}
                        {layerBonus.comment ? ` · ${layerBonus.comment}` : ""}
                      </>
                    ) : null}
                  </span>
                </p>
              );
            })}
            {totals.map(({ layer, totals: layerTotals, bonus: layerBonus }) => (
              <p key={`total-${layer.id}`} className="text-sm text-app-muted">
                {formatShiftTotalsLine(
                  periodLabel(layer),
                  layerTotals,
                  layerBonus,
                )}
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
      ) : null}
    </div>
  );
}
