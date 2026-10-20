import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DayNoteList } from "@/components/DayNoteList";
import { EventList } from "@/components/EventList";
import { LoadingBar } from "@/components/LoadingBar";
import { SearchField } from "@/components/SearchField";
import { TodoList, type TodoRow } from "@/components/TodoList";
import { apiFetch } from "@/lib/api";
import { type DayNote } from "@/lib/dayNotes";
import {
  searchEventEntry,
  type CalendarEvent,
} from "@/lib/events";

interface SearchResponse {
  q: string;
  todos: TodoRow[];
  events: CalendarEvent[];
  notes: DayNote[];
}

const emptyResult: SearchResponse = { q: "", todos: [], events: [], notes: [] };

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [input, setInput] = useState(q);
  const [loading, setLoading] = useState(Boolean(q));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse>(emptyResult);

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
    if (!q) {
      setResult(emptyResult);
      setLoading(false);
      setRefreshing(false);
      setError("");
      return;
    }

    let cancelled = false;
    async function load() {
      setError("");
      setRefreshing(true);
      try {
        const res = await apiFetch(`/search/?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SearchResponse;
        if (!cancelled) setResult(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось выполнить поиск");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const eventEntries = useMemo(
    () => result.events.map(searchEventEntry),
    [result.events],
  );
  const total =
    result.todos.length + result.events.length + result.notes.length;

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

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 md:py-8">
      <div className="relative space-y-6">
        <div>
          <h1 className="mb-3 text-2xl font-semibold">Поиск</h1>
          <SearchField
            value={input}
            onChange={setInput}
            onSubmit={submitQuery}
          />
          <div className="pointer-events-none absolute inset-x-0 z-10">
            <LoadingBar active={refreshing} />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading || (refreshing && total === 0) ? (
          <p className="text-sm text-app-subtle">Ищем…</p>
        ) : !q ? (
          <p className="text-sm text-app-subtle">
            Введите запрос — задачи, события, заметки и теги.
          </p>
        ) : total === 0 ? (
          <p className="text-sm text-app-subtle">Ничего не найдено</p>
        ) : (
          <div
            className={
              "space-y-8 " + (refreshing ? "pointer-events-none opacity-50" : "")
            }
            aria-busy={refreshing}
          >
            <section className="min-w-0 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
                Задачи
                <span className="ml-2 font-normal text-app-subtle">
                  {result.todos.length}
                </span>
              </h2>
              {result.todos.length > 0 ? (
                <TodoList
                  todos={result.todos}
                  onUpdated={(todo) =>
                    setResult((prev) => ({
                      ...prev,
                      todos: prev.todos.map((row) =>
                        row.id === todo.id ? todo : row,
                      ),
                    }))
                  }
                  onDeleted={(id) =>
                    setResult((prev) => ({
                      ...prev,
                      todos: prev.todos.filter((row) => row.id !== id),
                    }))
                  }
                />
              ) : (
                <p className="text-sm text-app-subtle">Задач нет</p>
              )}
            </section>
            <section className="min-w-0 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
                События
                <span className="ml-2 font-normal text-app-subtle">
                  {result.events.length}
                </span>
              </h2>
              {eventEntries.length > 0 ? (
                <EventList
                  entries={eventEntries}
                  showDate
                  onUpdated={(event) =>
                    setResult((prev) => ({
                      ...prev,
                      events: prev.events.map((row) =>
                        row.id === event.id ? event : row,
                      ),
                    }))
                  }
                  onDeleted={(id) =>
                    setResult((prev) => ({
                      ...prev,
                      events: prev.events.filter((row) => row.id !== id),
                    }))
                  }
                />
              ) : (
                <p className="text-sm text-app-subtle">Событий нет</p>
              )}
            </section>
            <section className="min-w-0 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-app-muted">
                Заметки
                <span className="ml-2 font-normal text-app-subtle">
                  {result.notes.length}
                </span>
              </h2>
              {result.notes.length > 0 ? (
                <DayNoteList notes={result.notes} />
              ) : (
                <p className="text-sm text-app-subtle">Заметок нет</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
