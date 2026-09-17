export function InboxSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-10 rounded-lg border border-app bg-app-surface" />
      <div className="flex gap-2">
        <div className="h-10 w-10 shrink-0 rounded-md border border-app bg-app-surface" />
        <div className="h-10 min-w-0 flex-1 rounded-md border border-app bg-app-surface" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex overflow-hidden rounded-lg border border-app bg-app-surface"
          >
            <div className="w-1 bg-app-border" />
            <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
              <div className="h-5 w-5 shrink-0 rounded-full bg-app-border" />
              <div className="h-4 flex-1 rounded bg-app-border" />
              <div className="h-3 w-14 shrink-0 rounded bg-app-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
