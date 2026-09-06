"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

import { Header } from "@/components/Header";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

interface Project {
  id: number;
  project_name: string;
  color: string;
  description?: string;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const hasToken = !!getAccessToken();

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }

    async function loadProjects() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch("/projects/");
        if (!res.ok) throw new Error("Failed to load projects");
        const data = (await res.json()) as Project[];
        setProjects(data);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить проекты");
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [hasToken]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    try {
      setCreating(true);
      setError("");
      const res = await apiFetch("/projects/", {
        method: "POST",
        body: JSON.stringify({
          project_name: name,
          color: newColor,
          description: newDescription.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create project");
      const created = (await res.json()) as Project;
      setProjects((prev) => [created, ...prev]);
      setNewName("");
      setNewDescription("");
    } catch (e) {
      console.error(e);
      setError("Не удалось создать проект");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-50">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {!hasToken ? (
          <p className="text-sm text-slate-300">
            Вы не вошли. Перейдите на{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              страницу входа
            </Link>
            .
          </p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Новый проект</h2>
              <form
                onSubmit={handleCreate}
                className="flex flex-col gap-3 md:flex-row md:items-center"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Название проекта..."
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2
                             text-sm placeholder:text-slate-500 focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-10 w-16 rounded-md border border-slate-700 bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
                             hover:bg-blue-500 active:bg-blue-700 transition-colors
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? "Создаю..." : "Создать"}
                </button>
              </form>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Мои проекты</h2>
              {loading ? (
                <p className="text-sm text-slate-400">Загрузка проектов...</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-slate-400">Проектов пока нет.</p>
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {projects.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-slate-800 bg-slate-800/60 px-4 py-3"
                    >
                      <Link
                        href={`/projects/${p.id}`}
                        className="block"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="font-medium">{p.project_name}</span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {p.description}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
