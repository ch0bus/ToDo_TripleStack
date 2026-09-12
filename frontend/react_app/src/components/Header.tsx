import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { useAppShell } from "@/contexts/AppShellContext";
import { clearTokens, getAccessToken } from "@/lib/auth";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filtersToggle } = useAppShell();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getAccessToken());
  }, [location.pathname]);

  const showFiltersMenu =
    hasToken &&
    (location.pathname === "/" || location.pathname === "/calendar") &&
    typeof filtersToggle === "function";

  function handleLogout() {
    clearTokens();
    setHasToken(false);
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-app bg-app-header backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {showFiltersMenu && (
            <button
              type="button"
              onClick={() => filtersToggle?.()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-app bg-app-surface-muted text-app hover:opacity-90 lg:hidden"
              aria-label="Фильтры и теги"
            >
              <span className="sr-only">Фильтры и теги</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link to="/" className="truncate text-xl font-semibold text-app">
            ToDo App
          </Link>
        </div>

        <nav className="flex shrink-0 items-center gap-2 text-sm text-app-muted sm:gap-3">
          <ThemeToggleButton />
          {hasToken ? (
            <>
              <Link to="/settings" className="hover:text-app hover:underline">
                Настройки
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hover:text-app hover:underline"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-app hover:underline">
                Вход
              </Link>
              <Link to="/register" className="hover:text-app hover:underline">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
