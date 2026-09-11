import { useEffect } from "react";

import { TodoForm } from "@/components/TodoForm";
import { useFocusTrap } from "@/lib/useFocusTrap";
import type { TagOption } from "@/lib/tags";

interface TodoFormModalProps {
  open: boolean;
  tags: TagOption[];
  onClose: () => void;
  onCreated: (todo: unknown) => void;
}

export function TodoFormModal({
  open,
  tags,
  onClose,
  onCreated,
}: TodoFormModalProps) {
  const panelRef = useFocusTrap(open);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-todo-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-todo-title" className="text-lg font-semibold">
            Новая задача
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <TodoForm
          tags={tags}
          onCreated={(todo) => {
            onCreated(todo);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
