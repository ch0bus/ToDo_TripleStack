import { Link, useLocation } from "react-router-dom";

import { TagChips } from "@/components/TagChips";
import {
  dayNotePath,
  formatDayNoteLabel,
  type DayNote,
} from "@/lib/dayNotes";
import { locationFrom } from "@/lib/nav";

export function DayNoteList({ notes }: { notes: DayNote[] }) {
  const location = useLocation();
  return (
    <ul className="space-y-2">
      {notes.map((note) => {
        const [title, ...restParts] = note.text.split(/\n+/);
        const rest = restParts.join(" ");
        return (
          <li key={note.date}>
            <Link
              to={dayNotePath(note.date)}
              state={{ from: locationFrom(location) }}
              className="calendar-day-note flex min-w-0 overflow-hidden rounded-lg border bg-app-surface hover:opacity-90"
            >
              <span
                className="w-1 shrink-0 self-stretch bg-[var(--calendar-note-frame)]"
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate text-[15px] font-medium leading-snug text-app">
                    {title}
                  </span>
                  {rest ? (
                    <span className="mt-0.5 block truncate text-[12px] leading-relaxed text-app-subtle">
                      {rest}
                    </span>
                  ) : null}
                  <TagChips tags={note.tags} />
                </span>
                <span className="shrink-0 pt-0.5 text-xs text-app-subtle">
                  {formatDayNoteLabel(note.date)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
