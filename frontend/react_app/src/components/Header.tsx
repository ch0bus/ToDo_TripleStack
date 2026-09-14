import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { BrandMark } from "@/components/BrandMark";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { UserMenu } from "@/components/UserMenu";
import { useAppShell } from "@/contexts/AppShellContext";
import { getAccessToken } from "@/lib/auth";

export function Header() {
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

  return (
    <header className="sticky top-0 z-30 w-full border-b border-app bg-app-header backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="min-w-0 shrink-0 text-app hover:opacity-90"
            aria-label="Haloday"
          >
            <BrandMark />
          </Link>
          {hasToken && (
            <Link
              to="/calendar"
              className={
                "hidden shrink-0 text-sm hover:text-app hover:underline sm:inline " +
                (location.pathname === "/calendar"
                  ? "font-medium text-app"
                  : "text-app-muted")
              }
            >
              Календарь
            </Link>
          )}
        </div>

        <nav className="flex shrink-0 items-center gap-2 text-sm text-app-muted sm:gap-3">
          {!hasToken && (
            <>
              <Link to="/login" className="hover:text-app hover:underline">
                Вход
              </Link>
              <Link to="/register" className="hover:text-app hover:underline">
                Регистрация
              </Link>
            </>
          )}
          {hasToken && (
            <Link
              to="/calendar"
              className={
                "flex h-9 w-9 items-center justify-center rounded-md border border-app bg-app-surface-muted sm:hidden " +
                (location.pathname === "/calendar"
                  ? "text-app"
                  : "text-app-muted hover:text-app")
              }
              aria-label="Календарь"
              title="Календарь"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
              </svg>
            </Link>
          )}
          <ThemeToggleButton />
          {hasToken && <UserMenu />}
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
        </nav>
      </div>
    </header>
  );
}
