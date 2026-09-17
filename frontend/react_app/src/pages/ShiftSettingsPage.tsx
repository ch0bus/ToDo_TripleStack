import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

import { ShiftCalendarPicker } from "@/components/ShiftCalendarPicker";
import { ShiftSchedulePanel } from "@/components/ShiftSchedulePanel";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  emptyPattern,
  nextShiftCalendarName,
  type ShiftCalendar,
  type ShiftKind,
  type ShiftKindWrite,
  type ShiftLayer,
  type ShiftPattern,
} from "@/lib/shifts";
import { backFromState, backLabel } from "@/lib/nav";
import { cardClass } from "@/lib/uiClasses";

export function ShiftSettingsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendars, setCalendars] = useState<ShiftCalendar[]>([]);
  const [layers, setLayers] = useState<ShiftLayer[]>([]);
  const [kinds, setKinds] = useState<ShiftKind[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const calendarIdFromUrl = Number(searchParams.get("calendar") ?? "");
  const selected =
    calendars.find((row) => row.id === calendarIdFromUrl) ?? calendars[0];
  const activeLayer =
    layers.find((layer) => layer.id === activeLayerId) ?? layers[0];
  const activeKinds = useMemo(
    () =>
      kinds.filter((kind) => (activeLayer ? kind.layer_id === activeLayer.id : false)),
    [kinds, activeLayer],
  );
  const activePattern = useMemo(() => {
    if (!activeLayer) return emptyPattern(null);
    return (
      patterns.find((row) => row.layer_id === activeLayer.id) ??
      emptyPattern(activeLayer.id)
    );
  }, [patterns, activeLayer]);

  const calendarFallback = selected
    ? `/calendar?calendar=${selected.id}`
    : "/calendar";
  const backTo = backFromState(location.state, calendarFallback);

  const loadCalendars = useCallback(async () => {
    const res = await apiFetch("/shift-calendars/");
    if (res.ok) setCalendars((await res.json()) as ShiftCalendar[]);
  }, []);

  const loadShifts = useCallback(async () => {
    if (!selected) return;
    const calendarQ = `calendar=${selected.id}`;
    const [layersRes, kindsRes, patternRes] = await Promise.all([
      apiFetch(`/shift-layers/?${calendarQ}`),
      apiFetch(`/shift-kinds/?${calendarQ}`),
      apiFetch(`/shift-pattern/?${calendarQ}`),
    ]);
    if (layersRes.ok) {
      const nextLayers = (await layersRes.json()) as ShiftLayer[];
      setLayers(nextLayers);
      setActiveLayerId((current) => {
        if (current && nextLayers.some((layer) => layer.id === current)) {
          return current;
        }
        return nextLayers[0]?.id ?? null;
      });
    }
    if (kindsRes.ok) setKinds((await kindsRes.json()) as ShiftKind[]);
    if (patternRes.ok) {
      const payload = await patternRes.json();
      setPatterns(
        Array.isArray(payload) ? (payload as ShiftPattern[]) : [payload as ShiftPattern],
      );
    }
  }, [selected]);

  useEffect(() => {
    if (!getAccessToken()) return;
    setLoading(true);
    setError("");
    loadCalendars()
      .catch(() => setError("Не удалось загрузить календари смен"))
      .finally(() => setLoading(false));
  }, [loadCalendars]);

  useEffect(() => {
    if (!selected) return;
    loadShifts().catch(() => setError("Не удалось загрузить настройки смен"));
  }, [selected, loadShifts]);

  function selectCalendar(id: number) {
    setActiveLayerId(null);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("calendar", String(id));
      return params;
    });
  }

  async function handleCreateCalendar() {
    const name = nextShiftCalendarName(calendars);
    const res = await apiFetch("/shift-calendars/", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as ShiftCalendar;
    setCalendars((prev) => [...prev, created]);
    selectCalendar(created.id);
  }

  async function handleRenameCalendar(name: string) {
    if (!selected) return;
    const res = await apiFetch(`/shift-calendars/${selected.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("rename calendar failed");
    await loadCalendars();
  }

  async function handleDeleteCalendar() {
    if (!selected || calendars.length <= 1) return;
    if (!window.confirm("Удалить этот календарь смен?")) return;
    const res = await apiFetch(`/shift-calendars/${selected.id}/`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const remaining = calendars.filter((row) => row.id !== selected.id);
    setCalendars(remaining);
    if (remaining[0]) selectCalendar(remaining[0].id);
  }

  async function handleRenameLayer(id: number, name: string) {
    const res = await apiFetch(`/shift-layers/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("rename layer failed");
    await loadShifts();
  }

  async function handleCreateKind(payload: ShiftKindWrite) {
    const res = await apiFetch("/shift-kinds/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("create kind failed");
    await loadShifts();
  }

  async function handleUpdateKind(
    id: number,
    payload: Omit<ShiftKindWrite, "layer_id">,
  ) {
    const res = await apiFetch(`/shift-kinds/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("update kind failed");
    await loadShifts();
  }

  async function handleDeleteKind(id: number) {
    const res = await apiFetch(`/shift-kinds/${id}/`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete kind failed");
    await loadShifts();
  }

  async function handleSavePattern(
    startDate: string,
    endDate: string | null,
    kindIds: Array<number | null>,
  ) {
    if (!activeLayer) throw new Error("no layer");
    const res = await apiFetch("/shift-pattern/", {
      method: "PUT",
      body: JSON.stringify({
        layer_id: activeLayer.id,
        start_date: startDate,
        end_date: endDate,
        slots: kindIds.map((kind_id) => ({ kind_id })),
      }),
    });
    if (!res.ok) throw new Error("save pattern failed");
    await loadShifts();
  }

  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-app">Настройки смен</h1>
        <ShiftCalendarPicker
          className="min-w-0 w-full sm:w-auto sm:flex-none"
          calendars={calendars}
          value={selected?.id ?? null}
          onChange={selectCalendar}
          onCreate={() => void handleCreateCalendar()}
        />
      </div>

      {error && (
        <div className="chip-danger mb-4 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className={"h-48 animate-pulse rounded-xl border border-app " + cardClass} />
      ) : selected && activeLayer ? (
        <div className={"p-4 sm:p-5 " + cardClass}>
          <ShiftSchedulePanel
            key={`${selected.id}-${activeLayer.id}`}
            calendar={selected}
            canDeleteCalendar={calendars.length > 1}
            layers={layers}
            activeLayer={activeLayer}
            kinds={activeKinds}
            pattern={activePattern}
            onActiveLayerChange={setActiveLayerId}
            onRenameLayer={handleRenameLayer}
            onRenameCalendar={handleRenameCalendar}
            onDeleteCalendar={handleDeleteCalendar}
            onCreateKind={handleCreateKind}
            onUpdateKind={handleUpdateKind}
            onDeleteKind={handleDeleteKind}
            onSavePattern={handleSavePattern}
          />
        </div>
      ) : (
        <p className="text-sm text-app-subtle">Нет календаря смен.</p>
      )}
    </div>
  );
}
