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
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? "text-slate-50"}`}>
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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Всего" value={total} />
      <StatCard label="Выполнено" value={done} accent="text-green-400" />
      <StatCard label="В процессе" value={inProgress} accent="text-blue-400" />
      <StatCard label="Просрочено" value={overdue} accent="text-red-400" />
    </div>
  );
}
