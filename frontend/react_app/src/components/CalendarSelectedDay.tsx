import type { ReactNode } from "react";

import { CalendarOccurrenceRow } from "@/components/CalendarOccurrenceRow";
import { DayNoteEditor } from "@/components/DayNoteEditor";
import { EventList } from "@/components/EventList";
import { TodoItem } from "@/components/TodoItem";
import type { TodoRow } from "@/components/TodoList";
import { formatDayTitle, type CalendarEntry } from "@/lib/calendar";
import type { DayNote } from "@/lib/dayNotes";
import type { EventEntry } from "@/lib/events";
import { pluralRu } from "@/lib/utils";

export function CalendarSelectedDay({
  selectedDay,
  selectedKey,
  selectedNote,
  selectedEntries,
  selectedEventEntries,
  shiftSummary,
  showNote = true,
  showTodos = true,
  showEvents = true,
  showCounts = true,
  showEmpty = false,
  eventListClassName,
  onNoteChanged,
  onTodoUpdated,
  onTodoDeleted,
  onEventDeleted,
}: {
  selectedDay: Date;
  selectedKey: string;
  selectedNote: DayNote | undefined;
  selectedEntries: CalendarEntry[];
  selectedEventEntries: EventEntry[];
  shiftSummary?: ReactNode;
  showNote?: boolean;
  showTodos?: boolean;
  showEvents?: boolean;
  showCounts?: boolean;
  showEmpty?: boolean;
  eventListClassName?: string;
  onNoteChanged: (note: DayNote | null) => void;
  onTodoUpdated: (todo: TodoRow) => void;
  onTodoDeleted: (id: number) => void;
  onEventDeleted: (id: number) => void;
}) {
  const realCount = selectedEntries.filter((entry) => !entry.virtual).length;
  const repeatCount = selectedEntries.length - realCount;
  const caption = [
    selectedEventEntries.length
      ? `${selectedEventEntries.length} ${pluralRu(selectedEventEntries.length, "событие", "события", "событий")}`
      : "",
    realCount ? `${realCount} задач` : "",
    repeatCount
      ? `${repeatCount} ${pluralRu(repeatCount, "повтор", "повтора", "повторов")}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ") || "Нет событий и задач в этот день";

  const empty =
    showEmpty &&
    selectedEntries.length === 0 &&
    selectedEventEntries.length === 0;

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize text-app">
          {formatDayTitle(selectedDay)}
        </h2>
        {showCounts ? (
          <p className="text-sm text-app-subtle">{caption}</p>
        ) : null}
      </div>
      {shiftSummary}
      {showNote ? (
        <DayNoteEditor
          dateKey={selectedKey}
          note={selectedNote}
          onChanged={onNoteChanged}
        />
      ) : null}
      {showEvents && selectedEventEntries.length > 0 ? (
        <EventList
          className={eventListClassName}
          entries={selectedEventEntries}
          onDeleted={onEventDeleted}
        />
      ) : null}
      {showTodos && selectedEntries.length > 0 ? (
        <ul className="space-y-2">
          {selectedEntries.map((entry) =>
            entry.virtual ? (
              <CalendarOccurrenceRow
                key={`${entry.todo.id}-${entry.dateKey}`}
                todo={entry.todo}
              />
            ) : (
              <TodoItem
                key={entry.todo.id}
                todo={entry.todo}
                onUpdated={onTodoUpdated}
                onDeleted={onTodoDeleted}
                whenMode="day"
              />
            ),
          )}
        </ul>
      ) : null}
      {empty ? (
        <p className="rounded-xl border border-dashed border-app px-4 py-6 text-sm text-app-subtle">
          На этот день ничего не запланировано.
        </p>
      ) : null}
    </section>
  );
}
