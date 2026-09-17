import { EventItem } from "@/components/EventItem";
import type { EventEntry } from "@/lib/events";

export function EventList({
  entries,
  onDeleted,
  showDate = false,
  className = "",
}: {
  entries: EventEntry[];
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
          onDeleted={onDeleted}
          showDate={showDate}
        />
      ))}
    </ul>
  );
}
