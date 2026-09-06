"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getAccessToken, clearTokens } from "@/lib/auth";

export function Header() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    setHasToken(!!token);
  }, []);

  function handleLogout() {
    clearTokens();
    setHasToken(false);
    router.push("/login");
  }

  return (
    <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">
          ToDo App
        </Link>

        <nav className="flex items-center gap-4 text-sm text-slate-300">
          {hasToken ? (
            <>
              <Link
                href="/projects/create"
                className="hover:text-slate-100 hover:underline"
              >
                Новый проект
              </Link>
              <button
                onClick={handleLogout}
                className="hover:text-slate-100 hover:underline"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hover:text-slate-100 hover:underline"
              >
                Вход
              </Link>
              <Link
                href="/register"
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
