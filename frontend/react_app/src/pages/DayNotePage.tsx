import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api";
import { formatDayTitle, parseDateKey } from "@/lib/calendar";
import {
  formatDayNoteLabel,
  type DayNote,
} from "@/lib/dayNotes";
import { btnDangerGhost, btnPrimary } from "@/lib/uiClasses";

function DetailSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-app bg-app-surface">
      <div className="flex animate-pulse">
        <div className="w-1 shrink-0 bg-[var(--calendar-note-frame)]/40" />
        <div className="min-w-0 flex-1 space-y-4 p-5">
          <div className="h-7 w-2/3 rounded bg-app-border" />
          <div className="h-40 rounded-lg bg-app-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export function DayNotePage() {
  const { date } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const dateKey = date && parseDateKey(date) ? date : "";
  const backTo =
    (location.state as { from?: string } | null)?.from || "/";
  const backLabel = backTo.startsWith("/calendar") ? "Календарь" : "Входящие";

  const [note, setNote] = useState<DayNote | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!dateKey) {
      setError("Некорректная дата");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch(`/day-notes/${dateKey}/`);
        if (res.status === 404) {
          setNote(null);
          setText("");
          return;
        }
        if (!res.ok) throw new Error("Failed to load note");
        const data = (await res.json()) as DayNote;
        setNote(data);
        setText(data.text);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить заметку");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [dateKey]);

  const trimmed = text.trim();
  const dirty = trimmed !== (note?.text ?? "");
  const parsed = dateKey ? parseDateKey(dateKey) : null;

  async function save() {
    if (!dateKey || !trimmed) return;
    try {
      setBusy(true);
      setError("");
      const res = await apiFetch("/day-notes/", {
        method: "PUT",
        body: JSON.stringify({ date: dateKey, text: trimmed }),
      });
      if (!res.ok) throw new Error("save failed");
      const saved = (await res.json()) as DayNote;
      setNote(saved);
      setText(saved.text);
      pushToast("Заметка сохранена", "success");
    } catch (e) {
      console.error(e);
      setError("Не удалось сохранить заметку");
      pushToast("Не удалось сохранить заметку", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!dateKey || !note) return;
    try {
      setBusy(true);
      const res = await apiFetch(`/day-notes/${dateKey}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("delete failed");
      pushToast("Заметка удалена", "success");
      navigate(backTo);
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить заметку");
      pushToast("Не удалось удалить заметку", "error");
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
          {backLabel}
        </Link>
      </nav>

      {error && (
        <div className="chip-danger mb-4 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        !error && <DetailSkeleton />
      ) : !dateKey ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="flex min-w-0 overflow-hidden rounded-xl border border-app bg-app-surface calendar-day-note"
        >
          <div
            className="w-1 shrink-0 self-stretch bg-[var(--calendar-note-frame)]"
            aria-hidden
          />
          <div className="grid min-w-0 flex-1 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
              <h1 className="text-xl font-semibold capitalize text-app sm:text-2xl">
                {parsed ? formatDayTitle(parsed) : dateKey}
              </h1>
              <p className="mt-1 text-sm text-app-subtle">Заметка</p>
              <textarea
                id="day-note-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                maxLength={2000}
                disabled={busy}
                placeholder="Напишите заметку к этому дню"
                className="mt-4 w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-1 text-sm leading-relaxed text-app placeholder:text-app-subtle focus:border-app focus:bg-app-input focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--app-accent)] focus:outline-none"
              />
            </div>
            <aside className="flex flex-col border-t border-app bg-app-surface-muted/40 lg:border-l lg:border-t-0">
              <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                    День
                  </p>
                  <p className="mt-1 px-1.5 text-sm text-app-muted">
                    {formatDayNoteLabel(dateKey)}
                  </p>
                </div>
                {note && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmOpen(true)}
                    className={btnDangerGhost + " self-start"}
                  >
                    Удалить
                  </button>
                )}
              </div>
              {dirty && (
                <div className="sticky bottom-0 mt-auto border-t border-app bg-app-header px-4 py-3 backdrop-blur lg:static lg:bg-transparent">
                  <button
                    type="submit"
                    disabled={busy || !trimmed}
                    className={btnPrimary + " w-full"}
                  >
                    {busy ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              )}
            </aside>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить заметку?"
        message="Заметка за этот день будет удалена."
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
