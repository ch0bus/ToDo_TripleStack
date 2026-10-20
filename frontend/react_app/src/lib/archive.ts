import {
  addDays,
  formatMonthTitle,
  formatWeekRangeTitle,
  monthBounds,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from "@/lib/calendar";
import type { TagRef } from "@/lib/tags";

export type ArchiveKind = "todos" | "events";
export type ArchivePeriod = "week" | "month" | "all" | "custom";

export function archivePath(
  kind: ArchiveKind,
  params?: {
    from?: string;
    to?: string;
    period?: Exclude<ArchivePeriod, "custom">;
    tag?: string;
  },
): string {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.period) query.set("period", params.period);
  if (params?.tag) query.set("tag", params.tag);
  const qs = query.toString();
  return qs ? `/archive/${kind}?${qs}` : `/archive/${kind}`;
}

export function resolveArchiveRange(
  search: URLSearchParams,
  today = new Date(),
): { from: string | null; to: string | null; period: ArchivePeriod } {
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  if (from && to && parseDateKey(from) && parseDateKey(to)) {
    const week = weekBounds(today);
    if (from === week.from && to === week.to) {
      return { from, to, period: "week" };
    }
    const month = monthBounds(today);
    if (from === month.from && to === month.to) {
      return { from, to, period: "month" };
    }
    return { from, to, period: "custom" };
  }
  if (search.get("period") === "all") {
    return { from: null, to: null, period: "all" };
  }
  if (search.get("period") === "month") {
    const month = monthBounds(today);
    return { from: month.from, to: month.to, period: "month" };
  }
  const week = weekBounds(today);
  return { from: week.from, to: week.to, period: "week" };
}

export function weekBounds(day: Date): { from: string; to: string } {
  const start = startOfWeek(day);
  return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
}

export function archivePeriodLabel(
  period: ArchivePeriod,
  from: string | null,
  to: string | null,
  today = new Date(),
): string {
  if (period === "all") return "всё время";
  if (period === "month") return formatMonthTitle(today);
  if (period === "week") return formatWeekRangeTitle(startOfWeek(today));
  if (from && to) {
    const start = parseDateKey(from);
    const end = parseDateKey(to);
    if (start && end) {
      return `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
    }
  }
  return "";
}

export function tagCounts(
  rows: { tags?: TagRef[] | null }[],
  limit = 6,
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      map.set(tag.tag_name, (map.get(tag.tag_name) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
