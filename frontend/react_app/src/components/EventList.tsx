import { EventItem } from "@/components/EventItem";
import type { CalendarEvent, EventEntry } from "@/lib/events";

export function EventList({
  entries,
  onUpdated,
  onDeleted,
  showDate = false,
  className = "",
}: {
  entries: EventEntry[];
  onUpdated?: (event: CalendarEvent) => void;
  onDeleted: (id: number) => void;
  showDate?: boolean;
  className?: string;
}) {
  if (!entries.length) return null;
  return (
    <ul className={"space-y-2" + (className ? ` ${className}` : "")}>
      {entries.map((entry) => (
        <EventItem
          key={`${entry.event.id}-${entry.occurrenceStartKey}`}
          entry={entry}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          showDate={showDate}
        />
      ))}
    </ul>
  );
}
