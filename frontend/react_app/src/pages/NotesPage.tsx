import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { DayNoteList } from "@/components/DayNoteList";
import { ChoiceChip } from "@/components/FormFields";
import { ListReveal } from "@/components/ListReveal";
import { LoadingBar } from "@/components/LoadingBar";
import { SearchField } from "@/components/SearchField";
import { apiFetch } from "@/lib/api";
import { parseDateKey, toDateKey } from "@/lib/calendar";
import {
  dayNotePath,
  notesPeriodLabel,
  resolveNotesRange,
  type DayNote,
  type NotesPeriod,
} from "@/lib/dayNotes";
import { locationFrom } from "@/lib/nav";
import {
  useHiddenSystemTags,
  visibleTagOptions,
  type TagOption,
} from "@/lib/tags";
import { btnPrimary, inputClass } from "@/lib/uiClasses";

const PERIODS: { value: Exclude<NotesPeriod, "custom">; label: string }[] = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
  { value: "all", label: "Всё" },
];

function AddNoteButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [date, setDate] = useState(toDateKey(new Date()));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!parseDateKey(date)) return;
    navigate(dayNotePath(date), {
      state: { from: locationFrom(location) },
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-w-0 flex-wrap items-center justify-end gap-2"
    >
      <input
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className={inputClass + " h-10 w-[11.5rem]"}
        aria-label="Дата заметки"
        required
      />
      <button type="submit" className={btnPrimary + " h-10 whitespace-nowrap"}>
        Добавить заметку
      </button>
    </form>
  );
}

export function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const tag = searchParams.get("tag") ?? "";
  const range = resolveNotesRange(searchParams);
  const { hidden } = useHiddenSystemTags();

  const [input, setInput] = useState(q);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed === q) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (trimmed) next.set("q", trimmed);
          else next.delete("q");
          return next;
        },
        { replace: true },
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input, q, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (q) query.set("q", q);
        if (tag) query.set("tag", tag);
        if (range.from && range.to) {
          query.set("from", range.from);
          query.set("to", range.to);
        }
        const qs = query.toString();
        const [notesRes, tagsRes] = await Promise.all([
          apiFetch(qs ? `/day-notes/?${qs}` : "/day-notes/"),
          apiFetch("/tags/"),
        ]);
        if (!notesRes.ok) throw new Error("load failed");
        const data = (await notesRes.json()) as DayNote[];
        if (cancelled) return;
        setNotes(data);
        if (tagsRes.ok) {
          setTags((await tagsRes.json()) as TagOption[]);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить заметки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [q, tag, range.from, range.to]);

  const tagOptions = visibleTagOptions(
    tags,
    hidden,
    tag ? [Number(tag)] : [],
  );

  function setPeriod(next: Exclude<NotesPeriod, "custom">) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete("from");
        params.delete("to");
        if (next === "all") params.delete("period");
        else params.set("period", next);
        return params;
      },
      { replace: true },
    );
  }

  function setTag(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next) params.set("tag", next);
        else params.delete("tag");
        return params;
      },
      { replace: true },
    );
  }

  function submitQuery(query: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (query) next.set("q", query);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }

  const empty =
    q
      ? "Ничего не найдено"
      : tag
        ? "Нет заметок с этим тегом"
        : range.period === "all"
          ? "Нет заметок"
          : "Нет заметок за этот период";

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 md:py-8">
      <div className="relative space-y-6">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">Заметки</h1>
              <p className="mt-1 text-sm text-app-subtle">
                {notesPeriodLabel(range.period, range.from, range.to)}
              </p>
            </div>
            <AddNoteButton />
          </div>
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Период">
            {PERIODS.map((option) => (
              <ChoiceChip
                key={option.value}
                selected={range.period === option.value}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </div>
          {tagOptions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Тег">
              <ChoiceChip selected={!tag} onClick={() => setTag("")}>
                Все
              </ChoiceChip>
              {tagOptions.map((option) => (
                <ChoiceChip
                  key={option.id}
                  selected={tag === String(option.id)}
                  onClick={() =>
                    setTag(tag === String(option.id) ? "" : String(option.id))
                  }
                >
                  {option.tag_name}
                </ChoiceChip>
              ))}
            </div>
          ) : null}
          <div className="mt-3">
            <SearchField
              value={input}
              onChange={setInput}
              onSubmit={submitQuery}
              placeholder="Поиск по тексту"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 z-10">
            <LoadingBar active={loading} />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && notes.length > 0 ? (
          <p className="text-sm text-app-muted">
            {notes.length} {noteCountLabel(notes.length)}
          </p>
        ) : null}

        <div
          className={loading ? "pointer-events-none opacity-50" : ""}
          aria-busy={loading}
        >
          {notes.length > 0 ? (
            <ListReveal items={notes}>
              {(visible) => <DayNoteList notes={visible} variant="tiles" />}
            </ListReveal>
          ) : loading ? null : (
            <p className="text-sm text-app-subtle">{empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function noteCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заметка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заметки";
  return "заметок";
}
