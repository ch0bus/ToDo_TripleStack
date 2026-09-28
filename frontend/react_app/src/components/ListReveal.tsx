import { useEffect, useState, type ReactNode } from "react";

export const LIST_PAGE_SIZE = 20;

export function ListReveal<T>({
  items,
  pageSize = LIST_PAGE_SIZE,
  enabled = true,
  children,
}: {
  items: T[];
  pageSize?: number;
  enabled?: boolean;
  children: (visible: T[]) => ReactNode;
}) {
  const [shown, setShown] = useState(pageSize);

  useEffect(() => {
    setShown(pageSize);
  }, [items, pageSize]);

  if (!enabled || items.length <= pageSize) {
    return <>{children(items)}</>;
  }

  const visible = items.slice(0, shown);
  const rest = items.length - visible.length;
  if (rest <= 0) return <>{children(visible)}</>;

  return (
    <div className="space-y-2">
      {children(visible)}
      <button
        type="button"
        onClick={() => setShown((n) => n + pageSize)}
        className="w-full rounded-xl border border-dashed border-app px-4 py-2 text-sm text-app-muted hover:bg-app-surface-muted hover:text-app"
      >
        Ещё {Math.min(rest, pageSize)}
      </button>
    </div>
  );
}
