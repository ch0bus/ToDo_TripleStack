import { TodoForm } from "@/components/TodoForm";

interface TodoFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (todo: unknown) => void;
}

export function TodoFormModal({ open, onClose, onCreated }: TodoFormModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-todo-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-todo-title" className="text-lg font-semibold">
            Новая задача
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <TodoForm
          onCreated={(todo) => {
            onCreated(todo);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
