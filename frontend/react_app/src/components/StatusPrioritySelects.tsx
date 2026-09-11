import {
  PRIORITY_SELECT_OPTIONS,
  STATUS_SELECT_OPTIONS,
} from "@/lib/labels";
import { selectClass, selectClassFull } from "@/lib/uiClasses";

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  inline?: boolean;
  id?: string;
}

const inlineSelectClass =
  "max-w-[8.5rem] cursor-pointer appearance-none rounded-md border-0 bg-slate-700/70 py-0.5 pl-1.5 pr-6 text-[11px] text-slate-200 hover:bg-slate-700 focus:ring-2 focus:ring-blue-500/80 focus:outline-none disabled:opacity-50 sm:max-w-none sm:py-1 sm:pl-2 sm:pr-7 sm:text-xs";

export function StatusSelect({
  value,
  onChange,
  disabled,
  fullWidth,
  compact,
  inline,
  id,
}: StatusSelectProps) {
  const sizeClass = compact ? " max-w-[9.5rem] py-1 text-xs" : "";
  const className = inline
    ? inlineSelectClass
    : (fullWidth ? selectClassFull : selectClass) + sizeClass;
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label="Статус задачи"
    >
      {STATUS_SELECT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface PrioritySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  inline?: boolean;
  id?: string;
}

export function PrioritySelect({
  value,
  onChange,
  disabled,
  fullWidth,
  compact,
  inline,
  id,
}: PrioritySelectProps) {
  const sizeClass = compact ? " max-w-[9.5rem] py-1 text-xs" : "";
  const className = inline
    ? inlineSelectClass
    : (fullWidth ? selectClassFull : selectClass) + sizeClass;
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label="Приоритет задачи"
    >
      {PRIORITY_SELECT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
