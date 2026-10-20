import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import {
  ArchiveEventStatusFilter,
  ArchiveTagFilter,
} from "@/components/ArchiveFilters";
import { ArchiveShell } from "@/components/ArchiveShell";
import { EventList } from "@/components/EventList";
import { ListPager } from "@/components/ListPager";
import { SortBar } from "@/components/SortBar";
import { apiFetch } from "@/lib/api";
import { resolveArchiveRange } from "@/lib/archive";
import {
  EVENT_SORT_OPTIONS,
  attendedEventEntries,
  missedEventEntriesInRange,
  parseEventSort,
  sortArchiveEventEntries,
  type CalendarEvent,
  type EventEntry,
} from "@/lib/events";
import {
  matchesArchiveQuery,
  pageSlice,
  parsePage,
  parsePageSize,
} from "@/lib/listPage";
import { backFromState } from "@/lib/nav";
import { isRecurring } from "@/lib/recurrence";
import {
  useHiddenSystemTags,
  visibleTagOptions,
  type TagOption,
} from "@/lib/tags";

function eventMatchesTag(entry: EventEntry, tag: string): boolean {
  if (!tag) return true;
  return (entry.event.tags ?? []).some((item) => String(item.id) === tag);
}

function eventMatchesQuery(entry: EventEntry, q: string): boolean {
  return matchesArchiveQuery(
    [
      entry.event.title,
      entry.event.description,
      ...(entry.event.tags ?? []).map((item) => item.tag_name),
    ],
    q,
  );
}

export function ArchiveEventsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const backTo = backFromState(location.state);
  const tag = searchParams.get("tag") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const attn = searchParams.get("eattn") ?? "";
  const range = resolveArchiveRange(searchParams);
  const sort = parseEventSort(searchParams.get("esort"), "new");
  const { hidden } = useHiddenSystemTags();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError("");
        setLoading(true);
        const [eventsRes, tagsRes] = await Promise.all([
          apiFetch("/events/"),
          apiFetch("/tags/"),
        ]);
        if (!eventsRes.ok) throw new Error("load failed");
        const data = (await eventsRes.json()) as CalendarEvent[];
        if (cancelled) return;
        setEvents(data);
        if (tagsRes.ok) {
          setTags((await tagsRes.json()) as TagOption[]);
        }
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
  }, []);

  const attended = useMemo(
    () => attendedEventEntries(events, range.from, range.to),
    [events, range.from, range.to],
  );
  const missed = useMemo(
    () => missedEventEntriesInRange(events, range.from, range.to),
    [events, range.from, range.to],
  );

  const pool = useMemo(() => {
    if (attn === "open") return missed;
    if (attn === "all") return [...attended, ...missed];
    return attended;
  }, [attn, attended, missed]);

  const rows = useMemo(() => {
    const filtered = pool.filter(
      (entry) => eventMatchesTag(entry, tag) && eventMatchesQuery(entry, q),
    );
    return sortArchiveEventEntries(filtered, sort);
  }, [pool, tag, q, sort]);

  const pageSize = parsePageSize(searchParams.get("limit"));
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = parsePage(searchParams.get("page"), pageCount);
  const visible = pageSlice(rows, page, pageSize);

  const recurringAttended = attended.filter((entry) =>
    isRecurring(entry.event.recurrence),
  ).length;
  const recurringMissed = missed.filter((entry) =>
    isRecurring(entry.event.recurrence),
  ).length;
  const recurringTotal = recurringAttended + recurringMissed;
  const facts = [
    attended.length ? `${attended.length} был` : "",
    missed.length ? `${missed.length} пропущено` : "",
    recurringTotal ? `повторы ${recurringAttended} из ${recurringTotal}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const tagOptions = visibleTagOptions(tags, hidden, tag ? [Number(tag)] : []);

  return (
    <ArchiveShell
      kind="events"
      title="Отмеченные события"
      backTo={backTo}
      loading={loading}
      error={error}
      facts={loading ? "" : facts}
      extra={
        <div className="mt-3 space-y-2">
          <ArchiveEventStatusFilter />
          {tagOptions.length ? <ArchiveTagFilter tags={tags} /> : null}
        </div>
      }
      tools={
        <SortBar
          paramName="esort"
          defaultSort="new"
          options={EVENT_SORT_OPTIONS}
          label="Сортировка событий"
        />
      }
    >
      {rows.length > 0 ? (
        <>
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
          <ListPager total={rows.length} />
        </>
      ) : loading ? null : (
        <p className="text-sm text-app-subtle">
          {q
            ? "Ничего не найдено"
            : tag
              ? "Нет событий с этим тегом"
              : attn === "open"
                ? "Нет пропущенных событий"
                : "Нет отмеченных событий"}
        </p>
      )}
    </ArchiveShell>
  );
}
