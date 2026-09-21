export function SettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-hidden>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-app-border" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-app-border" />
          <div className="h-4 w-24 rounded bg-app-border" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-28 rounded bg-app-border" />
          <div className="rounded-xl border border-app bg-app-surface p-5">
            <div className="space-y-3">
              <div className="h-10 rounded-md bg-app-border" />
              <div className="h-10 rounded-md bg-app-border" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
