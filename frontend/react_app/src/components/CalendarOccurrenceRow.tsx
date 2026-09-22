import { EntityTile } from "@/components/EntityTile";
import type { TodoRow } from "@/components/TodoList";
import { getRecurrenceFact } from "@/lib/recurrence";
import { todoTileWhen } from "@/lib/tileWhen";
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
      className="h-4 w-4 shrink-0 text-app-subtle"
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
  const { when, whenSub, status, statusShort, overdue } = todoTileWhen(todo, "day");
  const facts =
    todo.recurrence && todo.recurrence !== "never"
      ? getRecurrenceFact(todo.recurrence)
      : "повтор";
  const tags = (todo.tags ?? []).map((tag) => tag.tag_name);

  return (
    <EntityTile
      className={getPriorityBorderClass(todo.priority) + " border-dashed"}
      stripeClassName={getPriorityStripeClass(todo.priority) + " opacity-60"}
      overdue={overdue}
      dimmed
      mark={<RepeatIcon />}
      title={todo.title}
      titleTo={`/todos/${todo.id}`}
      titleMuted
      when={when}
      whenSub={whenSub}
      status={status}
      statusShort={statusShort}
      facts={facts}
      tags={tags}
    />
  );
}
