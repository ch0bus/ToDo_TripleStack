import { TODO_STATUSES, getStatusLabel, type TodoStatus } from "@/lib/labels";

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
