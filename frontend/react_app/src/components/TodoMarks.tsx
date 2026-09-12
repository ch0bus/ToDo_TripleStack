import {
  TODO_STATUSES,
  getPriorityLabel,
  getStatusLabel,
  type TodoStatus,
} from "@/lib/labels";
import { getPriorityFillClass, getPriorityLevel } from "@/lib/utils";

export function nextStatus(status: string): TodoStatus {
  const i = TODO_STATUSES.indexOf(status as TodoStatus);
  return TODO_STATUSES[i < 0 ? 0 : (i + 1) % TODO_STATUSES.length];
}

export function StatusCycleIcon({
  status,
  className = "h-5 w-5",
}: {
  status: string;
  className?: string;
}) {
  if (status === "done") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={className + " text-emerald-500"}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <path
          d="M8 12.2 10.6 14.8 16.2 9.2"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "in_progress") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={className + " text-app-accent"}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className + " text-app-subtle group-hover/status:text-app-accent"}
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function StatusCycleButton({
  status,
  disabled,
  onClick,
  className = "",
  iconClassName,
}: {
  status: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  iconClassName?: string;
}) {
  const upcoming = nextStatus(status);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "group/status shrink-0 rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] disabled:opacity-40 " +
        className
      }
      aria-label={`Статус: ${getStatusLabel(status)}. Сменить на «${getStatusLabel(upcoming)}»`}
    >
      <StatusCycleIcon status={status} className={iconClassName} />
    </button>
  );
}

const PIP_HEIGHTS = ["h-1.5", "h-2.5", "h-3.5", "h-4"] as const;

export function PriorityPips({
  priority,
  className = "mt-1",
}: {
  priority: string;
  className?: string;
}) {
  const filled = getPriorityLevel(priority);
  const fillClass = getPriorityFillClass(priority);
  const label = getPriorityLabel(priority);

  return (
    <span
      className={"flex h-4 items-end gap-px " + className}
      title={`Приоритет: ${label}`}
      aria-label={`Приоритет: ${label}`}
    >
      {PIP_HEIGHTS.map((height, index) => (
        <span
          key={height}
          className={
            "w-[3px] rounded-[1px] " +
            height +
            " " +
            (index < filled ? fillClass : "bg-app-border")
          }
          aria-hidden
        />
      ))}
    </span>
  );
}
