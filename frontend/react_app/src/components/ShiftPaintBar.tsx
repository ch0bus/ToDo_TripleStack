import type { PaintTool, ShiftKind, ShiftLayer } from "@/lib/shifts";

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function toolActive(paint: PaintTool, tool: PaintTool): boolean {
  if (paint.type !== tool.type) return false;
  if (paint.type === "kind" && tool.type === "kind") {
    return paint.id === tool.id;
  }
  return true;
}

export function ShiftPaintBar({
  layers,
  activeLayer,
  kinds,
  paint,
  onActiveLayerChange,
  onPaintChange,
  onClose,
}: {
  layers: ShiftLayer[];
  activeLayer: ShiftLayer;
  kinds: ShiftKind[];
  paint: PaintTool;
  onActiveLayerChange: (id: number) => void;
  onPaintChange: (tool: PaintTool) => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onActiveLayerChange(layer.id)}
            className={
              "rounded-md px-2.5 py-1 text-xs " +
              (layer.id === activeLayer.id
                ? "bg-app-surface-muted text-app"
                : "text-app-subtle hover:bg-app-surface-muted")
            }
          >
            {layer.position === 0 ? "↖ " : "↘ "}
            {layer.name}
          </button>
        ))}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-md p-1 text-app-subtle hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            aria-label="Скрыть рисование"
            title="Скрыть рисование"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onPaintChange({ type: "select" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "select" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          Выбор дня
        </button>
        {kinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            onClick={() => onPaintChange({ type: "kind", id: kind.id })}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs " +
              (toolActive(paint, { type: "kind", id: kind.id })
                ? "bg-app-surface-muted text-app"
                : "text-app-subtle hover:bg-app-surface-muted")
            }
          >
            <span
              className="h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: kind.color }}
              aria-hidden
            />
            {kind.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPaintChange({ type: "off" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "off" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          Выходной
        </button>
        <button
          type="button"
          onClick={() => onPaintChange({ type: "bonus" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "bonus" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          Доплата
        </button>
        <button
          type="button"
          onClick={() => onPaintChange({ type: "pattern" })}
          className={
            "rounded-md px-2.5 py-1 text-xs " +
            (toolActive(paint, { type: "pattern" })
              ? "bg-app-surface-muted text-app"
              : "text-app-subtle hover:bg-app-surface-muted")
          }
        >
          По шаблону
        </button>
      </div>
    </div>
  );
}
