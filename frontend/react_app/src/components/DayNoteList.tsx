import { Link, useLocation } from "react-router-dom";

import { TagChips } from "@/components/TagChips";
import {
  dayNotePath,
  formatDayNoteLabel,
  type DayNote,
} from "@/lib/dayNotes";
import { locationFrom } from "@/lib/nav";

const tileClass =
  "calendar-day-note flex h-40 min-w-0 overflow-hidden rounded-lg border bg-app-surface hover:opacity-90";

function noteParts(text: string): { title: string; rest: string } {
  const [title, ...restParts] = text.split(/\n+/);
  return { title, rest: restParts.join(" ") };
}

function DayNoteTile({ note, from }: { note: DayNote; from: string }) {
  const { title, rest } = noteParts(note.text);
  return (
    <Link
      to={dayNotePath(note.date)}
      state={{ from }}
      className={tileClass}
    >
      <span
        className="w-1 shrink-0 self-stretch bg-[var(--calendar-note-frame)]"
        aria-hidden
      />
      <span className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-2">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 min-w-0 text-[15px] font-medium leading-snug text-app">
            {title}
          </span>
          <span className="shrink-0 pt-0.5 text-xs text-app-subtle">
            {formatDayNoteLabel(note.date)}
          </span>
        </span>
        {rest ? (
          <span className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-app-subtle">
            {rest}
          </span>
        ) : null}
        <span className="mt-auto min-h-0 overflow-hidden">
          <TagChips tags={note.tags} />
        </span>
      </span>
    </Link>
  );
}

function DayNoteRow({ note, from }: { note: DayNote; from: string }) {
  const { title, rest } = noteParts(note.text);
  return (
    <Link
      to={dayNotePath(note.date)}
      state={{ from }}
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
  );
}

export function DayNoteList({
  notes,
  variant = "list",
}: {
  notes: DayNote[];
  variant?: "list" | "tiles";
}) {
  const location = useLocation();
  const from = locationFrom(location);

  if (variant === "tiles") {
    return (
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <li key={note.date} className="min-w-0">
            <DayNoteTile note={note} from={from} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note.date}>
          <DayNoteRow note={note} from={from} />
        </li>
      ))}
    </ul>
  );
}
