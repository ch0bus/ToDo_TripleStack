import type { ReactNode } from "react";

export function PropertyField({
  label,
  htmlFor,
  mark,
  children,
}: {
  label: string;
  htmlFor?: string;
  mark?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {mark}
        <label
          htmlFor={htmlFor}
          className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle"
        >
          {label}
        </label>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        "inline-flex items-center rounded-md px-2 py-1.5 text-xs transition-colors " +
        (selected
          ? "bg-app-surface-muted text-app"
          : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
      }
    >
      {children}
    </button>
  );
}
