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
    <div className="px-1 py-2 md:px-2">
      <p className="text-xs text-app-muted">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accent ?? "text-app"}`}>
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
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-1 md:grid-cols-4 md:gap-x-4">
      <StatCard label="Всего" value={total} />
      <StatCard label="Выполнено" value={done} accent="text-emerald-600" />
      <StatCard label="В процессе" value={inProgress} accent="text-blue-600" />
      <StatCard label="Просрочено" value={overdue} accent="text-red-600" />
    </div>
  );
}
