export function SettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-app bg-app-surface p-5"
        >
          <div className="mb-4 h-4 w-32 rounded bg-app-border" />
          <div className="space-y-3">
            <div className="h-10 rounded-md bg-app-border" />
            <div className="h-10 rounded-md bg-app-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
