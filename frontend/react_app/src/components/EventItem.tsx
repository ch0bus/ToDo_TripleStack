import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EventIcon } from "@/components/EventIcon";
import { EntityTile, MoreIcon } from "@/components/EntityTile";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import {
  isEventOccurrenceAttended,
  type CalendarEvent,
  type EventEntry,
} from "@/lib/events";
import { eventPath, locationFrom } from "@/lib/nav";
import { getRecurrenceFact } from "@/lib/recurrence";
import { eventTileWhen } from "@/lib/tileWhen";

interface EventItemProps {
  entry: EventEntry;
  onUpdated?: (event: CalendarEvent) => void;
  onDeleted: (id: number) => void;
  showDate?: boolean;
}

export function EventItem({
  entry,
  onUpdated,
  onDeleted,
  showDate = false,
}: EventItemProps) {
  const { event, virtual } = entry;
  const location = useLocation();
  const { pushToast } = useToast();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const attended =
    entry.attended || isEventOccurrenceAttended(event, entry.occurrenceStartKey);
  const { when, whenSub, status, statusShort, overdue } = eventTileWhen(
    entry,
    showDate ? "list" : "day",
  );
  const facts = virtual
    ? event.recurrence && event.recurrence !== "never"
      ? getRecurrenceFact(event.recurrence)
      : "повтор"
    : getRecurrenceFact(event.recurrence);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleToggleAttendance() {
    const next = !attended;
    try {
      setBusy(true);
      const res = await apiFetch(`/events/${event.id}/attendance/`, {
        method: "PUT",
        body: JSON.stringify({
          occurrence_date: entry.occurrenceStartKey,
          attended: next,
        }),
      });
      if (!res.ok) throw new Error("attendance failed");
      const updated = (await res.json()) as CalendarEvent;
      onUpdated?.(updated);
    } catch (e) {
      console.error(e);
      pushToast("Не удалось отметить посещение", "error");
    } finally {
      setBusy(false);
    }
  }

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
    <>
      <EntityTile
        className={"border-app" + (busy ? " opacity-80" : "") + (menuOpen ? " z-20" : "")}
        stripeStyle={{ backgroundColor: event.color }}
        overdue={overdue}
        dimmed={virtual && !attended}
        mark={
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleToggleAttendance()}
            className="rounded-md p-0.5 hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] disabled:opacity-40"
            aria-label={attended ? "Снять отметку посещения" : "Отметить посещение"}
            aria-pressed={attended}
          >
            <EventIcon color={event.color} attended={attended} />
          </button>
        }
        title={event.title}
        titleTo={eventPath(event.id)}
        titleState={{ from: locationFrom(location) }}
        when={when}
        whenSub={whenSub}
        status={status}
        statusShort={statusShort}
        facts={facts}
        menu={
          <div ref={menuRef} className="relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-md p-0.5 text-app-subtle opacity-70 hover:bg-app-surface-muted hover:text-app focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 disabled:opacity-40"
              aria-label="Действия с событием"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              <MoreIcon />
            </button>
            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-app bg-app-modal py-1 shadow-app"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)]"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Удалить событие?"
        message={`«${event.title}» будет удалено.`}
        loading={busy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
