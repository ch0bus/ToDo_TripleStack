import type { ReactNode } from "react";

export function MetaChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "danger" | "accent";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-900/50 bg-red-950/40 text-red-200"
      : tone === "accent"
        ? "border-blue-900/40 bg-blue-950/30 text-blue-200"
        : "border-slate-700/80 bg-slate-900/50 text-slate-300";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] leading-tight " +
        toneClass
      }
    >
      {children}
    </span>
  );
}
