import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { clearTokens, getAccessToken } from "@/lib/auth";

export function Header() {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getAccessToken());
  }, []);

  function handleLogout() {
    clearTokens();
    setHasToken(false);
    navigate("/login");
  }

  return (
    <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-semibold">
          ToDo App
        </Link>

        <nav className="flex items-center gap-4 text-sm text-slate-300">
          {hasToken ? (
            <button
              type="button"
              onClick={handleLogout}
              className="hover:text-slate-100 hover:underline"
            >
              Выйти
            </button>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-100 hover:underline">
                Вход
              </Link>
              <Link
                to="/register"
                className="hover:text-slate-100 hover:underline"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
