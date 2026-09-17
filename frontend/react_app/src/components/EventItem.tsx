import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  formatEventEntryWhen,
  type EventEntry,
} from "@/lib/events";
import { eventPath, locationFrom } from "@/lib/nav";
import { getRecurrenceLabel } from "@/lib/recurrence";

interface EventItemProps {
  entry: EventEntry;
  onDeleted: (id: number) => void;
  showDate?: boolean;
}

function EventIcon({ color }: { color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-5 w-5 shrink-0"
      style={{ color }}
      aria-hidden
    >
      <path d="M7 4.5h7.2c.7 0 1.3.6 1.3 1.3v14.2L11.2 17l-4.3 3V5.8c0-.7.6-1.3 1.3-1.3Z" />
    </svg>
  );
}

export function EventItem({ entry, onDeleted, showDate = false }: EventItemProps) {
  const { event, virtual } = entry;
  const location = useLocation();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const when = formatEventEntryWhen(entry, showDate);
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
      <div className="flex min-w-0 overflow-hidden rounded-lg border border-app bg-app-surface">
        <span
          className="w-1 shrink-0 self-stretch"
          style={{ backgroundColor: event.color }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 sm:gap-2.5 sm:px-3">
          <Link
            to={eventPath(event.id)}
            state={{ from: locationFrom(location) }}
            className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden text-left hover:opacity-90"
          >
            <EventIcon color={event.color} />
            <div className="min-w-0 flex-1 overflow-hidden pt-px">
              <p className="truncate text-[15px] font-medium leading-snug text-app">
                {event.title}
              </p>
              <p className="mt-0.5 truncate text-[12px] leading-relaxed text-app-subtle">
                {[when, virtual ? "повтор" : "", repeat]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </Link>
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
