import { nextThemeMode, themeModeLabel, type ThemeMode } from "@/lib/theme";
import { useTheme } from "@/contexts/ThemeContext";

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setMode(nextThemeMode(mode))}
      className={
        "flex h-9 w-9 items-center justify-center rounded-md border border-app bg-app-surface-muted text-app-muted transition-colors hover:text-app " +
        className
      }
      aria-label={themeModeLabel(mode)}
      title={themeModeLabel(mode)}
    >
      <ThemeIcon mode={mode} />
    </button>
  );
}
