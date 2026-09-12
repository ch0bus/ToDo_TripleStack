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
      ? "chip-danger"
      : tone === "accent"
        ? "chip-accent"
        : "chip-default";
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
