import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EventForm } from "@/components/EventForm";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import { defaultDueAtDay, parseDateKey } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/events";
import { backFromState, backLabel } from "@/lib/nav";
import { btnDangerGhost } from "@/lib/uiClasses";
import { toDatetimeLocalValue } from "@/lib/utils";

export function EventFormPage() {
  const { eventId } = useParams();
  const id = eventId ? Number(eventId) : null;
  const editing = id != null && !Number.isNaN(id);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pushToast } = useToast();
  const backTo = backFromState(location.state);
  const day = parseDateKey(searchParams.get("day") ?? "") ?? new Date();
  const defaultStart = toDatetimeLocalValue(defaultDueAtDay(day).toISOString());

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
            <h1 className="mb-4 text-xl font-semibold text-app sm:text-2xl">
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
            {editing && event && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
                className={btnDangerGhost + " mt-4"}
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
