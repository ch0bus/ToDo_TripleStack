import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  formatEventWhen,
  type CalendarEvent,
  type EventEntry,
} from "@/lib/events";
import { getRecurrenceLabel } from "@/lib/recurrence";
import { useState } from "react";

interface EventItemProps {
  entry: EventEntry;
  onEdit: (event: CalendarEvent) => void;
  onDeleted: (id: number) => void;
}

export function EventItem({ entry, onEdit, onDeleted }: EventItemProps) {
  const { event, virtual } = entry;
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const when = formatEventWhen(event);
  const repeat =
    event.recurrence && event.recurrence !== "never"
      ? getRecurrenceLabel(event.recurrence).toLowerCase()
      : "";

  async function handleDelete() {
    try {
      setBusy(true);
      const res = await apiFetch(`/events/${event.id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("delete failed");
      onDeleted(event.id);
      pushToast("Событие удалено", "success");
    } catch (e) {
      console.error(e);
      pushToast("Не удалось удалить событие", "error");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <li>
      <div className="flex overflow-hidden rounded-lg border border-app bg-app-surface">
        <span
          className="w-1 shrink-0 self-stretch"
          style={{ backgroundColor: event.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium text-app">{event.title}</p>
              <p className="mt-0.5 text-xs text-app-muted">
                {[when, virtual ? "повтор" : "", repeat]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--app-danger)] hover:bg-red-500/10 disabled:opacity-50"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Удалить событие?"
        message={`«${event.title}» будет удалено.`}
        loading={busy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}
