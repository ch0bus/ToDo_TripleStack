import type { ReactNode } from "react";

import { CalendarOccurrenceRow } from "@/components/CalendarOccurrenceRow";
import { DayNoteEditor } from "@/components/DayNoteEditor";
import { EventList } from "@/components/EventList";
import { TodoItem } from "@/components/TodoItem";
import type { TodoRow } from "@/components/TodoList";
import { formatDayTitle, type CalendarEntry } from "@/lib/calendar";
import type { DayNote } from "@/lib/dayNotes";
import type { CalendarEvent, EventEntry } from "@/lib/events";

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
  showEmpty = false,
  eventListClassName,
  onNoteChanged,
  onTodoUpdated,
  onTodoDeleted,
  onEventDeleted,
  onEventUpdated,
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
  showEmpty?: boolean;
  eventListClassName?: string;
  onNoteChanged: (note: DayNote | null) => void;
  onTodoUpdated: (todo: TodoRow) => void;
  onTodoDeleted: (id: number) => void;
  onEventUpdated: (event: CalendarEvent) => void;
  onEventDeleted: (id: number) => void;
}) {
  const empty =
    showEmpty &&
    selectedEntries.length === 0 &&
    selectedEventEntries.length === 0;

  return (
    <section className="min-w-0 space-y-3">
      {shiftSummary ?? (
        <h2 className="text-lg font-semibold capitalize text-app">
          {formatDayTitle(selectedDay)}
        </h2>
      )}
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
          onUpdated={onEventUpdated}
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
