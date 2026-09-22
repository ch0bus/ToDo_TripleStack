export function InboxSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-10 rounded-lg border border-app bg-app-surface" />
      <div className="flex gap-2">
        <div className="h-10 w-10 shrink-0 rounded-md border border-app bg-app-surface" />
        <div className="h-10 min-w-0 flex-1 rounded-md border border-app bg-app-surface" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="entity-tile flex overflow-hidden rounded-lg border border-app bg-app-surface"
          >
            <div className="w-1 bg-app-border" />
            <div className="entity-tile-grid min-w-0 flex-1">
              <div className="entity-tile-mark h-4 w-4 justify-self-center rounded-full bg-app-border" />
              <div className="entity-tile-title h-4 rounded bg-app-border" />
              <div className="entity-tile-status h-3 w-16 justify-self-end rounded bg-app-border" />
              <div className="entity-tile-when h-3 w-12 justify-self-end rounded bg-app-border" />
              <div className="entity-tile-menu" />
              <div className="entity-tile-facts h-2.5 w-24 rounded bg-app-border" />
              <div className="entity-tile-due" />
              <div className="entity-tile-tags flex h-[22px] items-center gap-1">
                <div className="h-4 w-14 rounded-full bg-app-border" />
                <div className="h-4 w-10 rounded-full bg-app-border" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
