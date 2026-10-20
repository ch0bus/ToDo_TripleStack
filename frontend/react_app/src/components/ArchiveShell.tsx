import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ChoiceChip } from "@/components/FormFields";
import { LoadingBar } from "@/components/LoadingBar";
import {
  archivePeriodLabel,
  resolveArchiveRange,
  type ArchiveKind,
  type ArchivePeriod,
} from "@/lib/archive";
import { backFromState, backLabel } from "@/lib/nav";

const PERIODS: { value: Exclude<ArchivePeriod, "custom">; label: string }[] = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "all", label: "Всё" },
];

export function ArchiveShell({
  kind,
  title,
  backTo,
  loading,
  error,
  facts,
  extra,
  children,
}: {
  kind: ArchiveKind;
  title: string;
  backTo: string;
  loading?: boolean;
  error?: string;
  facts: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = resolveArchiveRange(searchParams);
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  function setPeriod(next: Exclude<ArchivePeriod, "custom">) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete("from");
        params.delete("to");
        if (next === "week") params.delete("period");
        else params.set("period", next);
        return params;
      },
      { replace: true },
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 md:py-8">
      <div className="relative space-y-6">
        <nav className="flex items-center gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 text-sm text-app-muted transition-colors hover:text-app-accent"
          >
            <span aria-hidden>←</span>
            {backLabel(backTo)}
          </Link>
        </nav>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <Link
              to={`/archive/todos${suffix}`}
              state={{ from: backTo }}
              className={
                "rounded-md px-2 py-1.5 text-sm " +
                (kind === "todos"
                  ? "bg-app-surface-muted font-medium text-app"
                  : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
              }
            >
              Готово
            </Link>
            <Link
              to={`/archive/events${suffix}`}
              state={{ from: backTo }}
              className={
                "rounded-md px-2 py-1.5 text-sm " +
                (kind === "events"
                  ? "bg-app-surface-muted font-medium text-app"
                  : "text-app-subtle hover:bg-app-surface-muted hover:text-app")
              }
            >
              Был
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-app-subtle">
            {archivePeriodLabel(range.period, range.from, range.to)}
          </p>
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
          <div className="pointer-events-none absolute inset-x-0 z-10">
            <LoadingBar active={Boolean(loading)} />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {facts ? <p className="text-sm text-app-muted">{facts}</p> : null}
        {extra}

        <div
          className={loading ? "pointer-events-none opacity-50" : ""}
          aria-busy={loading}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
