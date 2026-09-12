import type { ReactNode } from "react";

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileSidebarDrawer({
  open,
  onClose,
  children,
}: MobileSidebarDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        className="overlay-app absolute inset-0"
        aria-label="Закрыть меню"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 h-full w-[min(100%,280px)] overflow-y-auto border-l border-app bg-app-surface p-4 shadow-app">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-app">Фильтры и теги</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
