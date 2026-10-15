import { inputClass } from "@/lib/uiClasses";

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = "Поиск задач, событий, заметок",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
}) {
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit(value.trim());
          }
        }}
        placeholder={placeholder}
        className={
          inputClass +
          " h-10 pr-11 [&::-webkit-search-cancel-button]:hidden"
        }
        aria-label={placeholder}
        autoComplete="off"
      />
      <button
        type="submit"
        aria-label="Искать"
        className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app"
      >
        <SearchIcon />
      </button>
    </form>
  );
}
