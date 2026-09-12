interface StatsCardsProps {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="min-w-0 px-0.5 py-1 sm:px-1 sm:py-2 md:px-2">
      <p className="truncate text-[10px] text-app-muted sm:text-xs">{label}</p>
      <p
        className={`text-xl font-semibold tabular-nums sm:text-2xl ${accent ?? "text-app"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function StatsCards({
  total,
  done,
  inProgress,
  overdue,
}: StatsCardsProps) {
  return (
    <div className="grid min-w-0 grid-cols-4 gap-x-1 sm:gap-x-2 md:gap-x-4">
      <StatCard label="Всего" value={total} />
      <StatCard label="Выполнено" value={done} accent="text-emerald-600" />
      <StatCard label="В процессе" value={inProgress} accent="text-blue-600" />
      <StatCard label="Просрочено" value={overdue} accent="text-red-600" />
    </div>
  );
}
