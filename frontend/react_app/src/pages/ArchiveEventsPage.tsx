import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { ArchiveShell } from "@/components/ArchiveShell";
import { EventList } from "@/components/EventList";
import { ListReveal } from "@/components/ListReveal";
import { apiFetch } from "@/lib/api";
import { resolveArchiveRange, tagCounts } from "@/lib/archive";
import {
  attendedEventEntries,
  missedEventEntriesInRange,
  type CalendarEvent,
} from "@/lib/events";
import { backFromState } from "@/lib/nav";
import { isRecurring } from "@/lib/recurrence";

export function ArchiveEventsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const backTo = backFromState(location.state);
  const tag = searchParams.get("tag") ?? undefined;
  const range = resolveArchiveRange(searchParams);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError("");
        setLoading(true);
        const path = tag
          ? `/events/?tag=${encodeURIComponent(tag)}`
          : "/events/";
        const res = await apiFetch(path);
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as CalendarEvent[];
        if (!cancelled) setEvents(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить отмеченные события");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  const attended = useMemo(
    () => attendedEventEntries(events, range.from, range.to),
    [events, range.from, range.to],
  );
  const missed = useMemo(
    () => missedEventEntriesInRange(events, range.from, range.to),
    [events, range.from, range.to],
  );
  const recurringAttended = attended.filter((entry) =>
    isRecurring(entry.event.recurrence),
  ).length;
  const recurringMissed = missed.filter((entry) =>
    isRecurring(entry.event.recurrence),
  ).length;
  const recurringTotal = recurringAttended + recurringMissed;
  const tags = useMemo(
    () => tagCounts(attended.map((entry) => entry.event)),
    [attended],
  );
  const facts = [
    attended.length ? `${attended.length} был` : "",
    missed.length ? `${missed.length} пропущено` : "",
    recurringTotal ? `повторы ${recurringAttended} из ${recurringTotal}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ArchiveShell
      kind="events"
      title="Был"
      backTo={backTo}
      loading={loading}
      error={error}
      facts={loading ? "" : facts}
      extra={
        tags.length ? (
          <p className="text-sm text-app-subtle">
            {tags.map((item) => `${item.name} ${item.count}`).join(" · ")}
          </p>
        ) : null
      }
    >
      {attended.length > 0 ? (
        <ListReveal items={attended}>
          {(visible) => (
            <EventList
              entries={visible}
              showDate
              onUpdated={(event) =>
                setEvents((prev) =>
                  prev.map((row) => (row.id === event.id ? event : row)),
                )
              }
              onDeleted={(id) =>
                setEvents((prev) => prev.filter((row) => row.id !== id))
              }
            />
          )}
        </ListReveal>
      ) : loading ? null : (
        <p className="text-sm text-app-subtle">
          {tag ? "Нет отмеченных событий с этим тегом" : "Нет отмеченных событий"}
        </p>
      )}
    </ArchiveShell>
  );
}
