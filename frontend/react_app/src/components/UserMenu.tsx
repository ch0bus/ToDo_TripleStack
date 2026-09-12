import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import { clearTokens } from "@/lib/auth";

function ProfileIcon() {
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
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.2c.7-3.1 3.3-5.2 6.5-5.2s5.8 2.1 6.5 5.2" />
    </svg>
  );
}

export function UserMenu() {
  const navigate = useNavigate();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/auth/me/");
        if (!res.ok) return;
        const data = (await res.json()) as { username?: string };
        if (!cancelled && data.username) setUsername(data.username);
      } catch {
        /* меню работает и без имени */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    clearTokens();
    navigate("/login");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-app bg-app-surface-muted text-app hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
        aria-label="Меню профиля"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <ProfileIcon />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Меню профиля"
          className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-lg border border-app bg-app-modal py-1 shadow-app"
        >
          {username && (
            <p className="truncate px-3 pb-1 pt-1.5 text-xs font-medium text-app">
              {username}
            </p>
          )}
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-sm text-app hover:bg-app-surface-muted"
          >
            Настройки профиля
          </Link>
          <div className="my-1 border-t border-app" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full px-3 py-1.5 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)]"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
