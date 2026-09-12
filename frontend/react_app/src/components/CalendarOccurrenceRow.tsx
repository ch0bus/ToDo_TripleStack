import { Link } from "react-router-dom";

import type { TodoRow } from "@/components/TodoList";
import { getRecurrenceLabel } from "@/lib/recurrence";
import { getPriorityBorderClass, getPriorityStripeClass } from "@/lib/utils";

function RepeatIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M17 1v4h-4" />
      <path d="M7 23v-4h4" />
      <path d="M20.5 9A8 8 0 0 0 7.2 5.2L7 5" />
      <path d="M3.5 15A8 8 0 0 0 16.8 18.8L17 19" />
    </svg>
  );
}

export function CalendarOccurrenceRow({ todo }: { todo: TodoRow }) {
  const stripe = getPriorityStripeClass(todo.priority);
  const repeatLabel = getRecurrenceLabel(todo.recurrence ?? "never").toLowerCase();

  return (
    <li
      className={
        "flex rounded-lg border border-dashed bg-app-surface/70 " +
        getPriorityBorderClass(todo.priority)
      }
    >
      {todo.priority !== "critical" && (
        <div
          className={"w-1 shrink-0 self-stretch rounded-l-lg opacity-60 " + stripe}
          aria-hidden
        />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 sm:px-3">
        <span className="text-app-subtle" title="Повтор задачи">
          <RepeatIcon />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`/todos/${todo.id}`}
            className="block truncate text-[15px] font-medium text-app-muted hover:text-app-accent"
          >
            {todo.title}
          </Link>
          <p className="text-[12px] text-app-subtle">Повтор · {repeatLabel}</p>
        </div>
      </div>
    </li>
  );
}
