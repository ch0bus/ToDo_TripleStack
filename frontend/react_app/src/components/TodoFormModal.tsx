import { useEffect } from "react";

import { TodoForm } from "@/components/TodoForm";
import { useFocusTrap } from "@/lib/useFocusTrap";
import type { TagOption } from "@/lib/tags";

interface TodoFormModalProps {
  open: boolean;
  tags: TagOption[];
  onClose: () => void;
  onCreated: (todo: unknown) => void;
  defaultEventDate?: string;
  defaultDueDate?: string;
}

export function TodoFormModal({
  open,
  tags,
  onClose,
  onCreated,
  defaultEventDate,
  defaultDueDate,
}: TodoFormModalProps) {
  const panelRef = useFocusTrap(open, "#new-todo-title-input");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="overlay-app fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-app bg-app-modal p-4 shadow-app sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-todo-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-todo-title" className="text-lg font-semibold text-app">
            Новая задача
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-app-muted hover:bg-app-surface-muted hover:text-app"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <TodoForm
          tags={tags}
          defaultEventDate={defaultEventDate}
          defaultDueDate={defaultDueDate}
          onCreated={(todo) => {
            onCreated(todo);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
