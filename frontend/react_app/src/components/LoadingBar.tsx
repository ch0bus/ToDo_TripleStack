export function LoadingBar({ active }: { active: boolean }) {
  return (
    <div
      className="h-0.5 w-full overflow-hidden rounded-full"
      role={active ? "status" : undefined}
      aria-live={active ? "polite" : undefined}
      aria-label={active ? "Загрузка" : undefined}
      aria-hidden={!active}
    >
      {active ? (
        <div className="loading-bar-indeterminate h-full rounded-full bg-[var(--app-accent)]" />
      ) : null}
    </div>
  );
}
