import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EventForm } from "@/components/EventForm";
import { EventIcon } from "@/components/EventIcon";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import { defaultDueAtDay, dueDateKey, parseDateKey, toDateKey } from "@/lib/calendar";
import {
  isEventOccurrenceAttended,
  type CalendarEvent,
} from "@/lib/events";
import { backFromState, backLabel } from "@/lib/nav";
import { isRecurring } from "@/lib/recurrence";
import { btnDangerGhost } from "@/lib/uiClasses";
import { formatDateCompact, toDatetimeLocalValue } from "@/lib/utils";

export function EventFormPage() {
  const { eventId } = useParams();
  const id = eventId ? Number(eventId) : null;
  const editing = id != null && !Number.isNaN(id);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pushToast } = useToast();
  const backTo = backFromState(location.state);
  const queryDay = parseDateKey(searchParams.get("day") ?? "");
  const day = queryDay ?? new Date();
  const defaultStart = toDatetimeLocalValue(defaultDueAtDay(day).toISOString());

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const occurrenceKey = editing
    ? queryDay
      ? toDateKey(queryDay)
      : event
        ? dueDateKey(event.start_at)
        : null
    : null;
  const attended =
    !!event &&
    !!occurrenceKey &&
    isEventOccurrenceAttended(event, occurrenceKey);
  const occurrenceLabel = occurrenceKey
    ? formatDateCompact(parseDateKey(occurrenceKey) ?? occurrenceKey)
    : "";

  useEffect(() => {
    if (!editing) return;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch(`/events/${id}/`);
        if (!res.ok) throw new Error("Failed to load event");
        setEvent((await res.json()) as CalendarEvent);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить событие");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [editing, id]);

  async function toggleAttendance() {
    if (!id || !event || !occurrenceKey) return;
    const next = !attended;
    try {
      setBusy(true);
      const res = await apiFetch(`/events/${id}/attendance/`, {
        method: "PUT",
        body: JSON.stringify({
          occurrence_date: occurrenceKey,
          attended: next,
        }),
      });
      if (!res.ok) throw new Error("attendance failed");
      setEvent((await res.json()) as CalendarEvent);
    } catch (e) {
      console.error(e);
      pushToast("Не удалось отметить посещение", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id) return;
    try {
      setBusy(true);
      const res = await apiFetch(`/events/${id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("delete failed");
      pushToast("Событие удалено", "success");
      navigate(backTo);
    } catch (e) {
      console.error(e);
      pushToast("Не удалось удалить событие", "error");
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-3 pb-8 pt-4 sm:px-4 sm:pt-6">
      <nav className="mb-4 flex items-center gap-3">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-app-muted transition-colors hover:text-app-accent"
        >
          <span aria-hidden>←</span>
          {backLabel(backTo)}
        </Link>
      </nav>

      {error && (
        <div className="chip-danger mb-4 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
          <div className="animate-pulse space-y-3 px-4 py-4 sm:px-5 sm:py-5" aria-hidden>
            <div className="h-7 w-2/3 rounded bg-app-border" />
            <div className="h-24 rounded-lg bg-app-surface-muted" />
          </div>
        </div>
      ) : editing && !event ? null : (
        <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
          <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
            <h1 className="mb-4 flex items-center gap-2 text-xl font-semibold text-app sm:text-2xl">
              {editing && event && occurrenceKey ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleAttendance()}
                  className="rounded-md p-0.5 hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] disabled:opacity-40"
                  aria-label={
                    attended ? "Снять отметку посещения" : "Отметить посещение"
                  }
                  aria-pressed={attended}
                >
                  <EventIcon
                    className="h-6 w-6 shrink-0"
                    color={event.color}
                    attended={attended}
                  />
                </button>
              ) : (
                <EventIcon
                  className="h-5 w-5 shrink-0"
                  color={event?.color}
                />
              )}
              {editing ? "Событие" : "Новое событие"}
            </h1>
            <EventForm
              key={event?.id ?? "new"}
              event={event}
              defaultStart={defaultStart}
              onSaved={(saved) => {
                if (editing) {
                  setEvent(saved);
                  return;
                }
                navigate(backTo, { replace: true });
              }}
            />
            {editing && event && occurrenceKey ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleAttendance()}
                className="mt-4 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-app hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] disabled:opacity-40"
                aria-pressed={attended}
              >
                <EventIcon
                  className="h-5 w-5 shrink-0"
                  color={event.color}
                  attended={attended}
                />
                <span>
                  {attended ? "Были" : "Не отмечено"}
                  {isRecurring(event.recurrence) && occurrenceLabel
                    ? ` · ${occurrenceLabel}`
                    : ""}
                </span>
              </button>
            ) : null}
            {editing && event && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
                className={btnDangerGhost + " mt-2"}
              >
                Удалить
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить событие?"
        message={event ? `«${event.title}» будет удалено.` : "Событие будет удалено."}
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
