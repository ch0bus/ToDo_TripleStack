"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setTokens } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail =
          (data.detail as string | undefined) ??
          "Не удалось войти. Проверь логин и пароль.";
        throw new Error(detail);
      }

      const data = (await res.json()) as {
        access: string;
        refresh: string;
      };

      setTokens(data.access, data.refresh);
      router.push("/");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-sm px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Вход
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2
                         text-sm placeholder:text-slate-500 focus:outline-none
                         focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2
                         text-sm placeholder:text-slate-500 focus:outline-none
                         focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
                       hover:bg-blue-500 active:bg-blue-700 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Вхожу..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}
