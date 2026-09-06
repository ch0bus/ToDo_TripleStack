"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

interface ProjectSelectorProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

interface ProjectOption {
  id: number;
  project_name: string;
}

export function ProjectSelector({ value, onChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/projects/");
        if (!res.ok) return;
        const data = (await res.json()) as ProjectOption[];
        setProjects(data);
      } catch (e) {
        console.error(e);
      }
    }

    load();
  }, []);

  return (
    <select
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value ? Number(e.target.value) : null)
      }
      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
    >
      <option value="">Без проекта</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.project_name}
        </option>
      ))}
    </select>
  );
}
