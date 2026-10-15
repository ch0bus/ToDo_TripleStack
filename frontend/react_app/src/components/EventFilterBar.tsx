import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ChoiceChip } from "@/components/FormFields";
import { parseEventAttn, type EventAttn } from "@/lib/events";

function PaletteIcon() {
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
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ATTN_OPTIONS: { value: EventAttn | ""; label: string }[] = [
  { value: "", label: "Все" },
  { value: "open", label: "Не отмечены" },
  { value: "attended", label: "Отмечены" },
];

export function EventFilterBar({
  colors,
  attendance = false,
}: {
  colors: string[];
  attendance?: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = searchParams.get("ecolor") ?? "";
  const attn = attendance ? parseEventAttn(searchParams.get("eattn")) : undefined;
  const active = Boolean(current || attn);

  function setColor(value: string) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === current) params.delete("ecolor");
    else params.set("ecolor", value);
    setSearchParams(params);
  }

  function setAttn(value: string) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === (attn ?? "")) params.delete("eattn");
    else params.set("eattn", value);
    setSearchParams(params);
  }

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
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          attendance ? "Фильтр событий по цвету и отметке" : "Фильтр событий по цвету"
        }
        onClick={() => setOpen((value) => !value)}
        className={
          "relative flex h-8 w-8 items-center justify-center rounded-md border " +
          (active || open
            ? "border-app-strong bg-app-surface-muted text-app"
            : "border-app text-app-muted hover:bg-app-surface-muted hover:text-app")
        }
      >
        <PaletteIcon />
        {active && (
          <span
            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: current || "var(--app-accent)",
            }}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={attendance ? "Цвет и отметка события" : "Цвет события"}
          className="absolute right-0 z-40 mt-1 w-52 rounded-xl border border-app bg-app-modal p-3 shadow-app"
        >
          {attendance ? (
            <div className="mb-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                Отметка
              </p>
              <div className="flex flex-wrap gap-1">
                {ATTN_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.value || "all"}
                    selected={(attn ?? "") === option.value}
                    onClick={() => setAttn(option.value)}
                  >
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
            Цвет
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!current}
              onClick={() => setColor("")}
              className={
                "rounded-md px-2 py-1 text-xs " +
                (!current
                  ? "bg-app-surface-muted text-app"
                  : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
              }
            >
              Все
            </button>
            {colors.map((color) => {
              const selected = current === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={selected}
                  onClick={() => setColor(color)}
                  className={
                    "h-7 w-7 rounded-full border " +
                    (selected ? "border-app-strong ring-2 ring-[var(--app-accent)]" : "border-app")
                  }
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
