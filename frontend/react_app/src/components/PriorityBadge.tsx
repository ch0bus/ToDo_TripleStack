"use client";

import { getPriorityColor } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const cls = getPriorityColor(priority);

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
        cls
      }
    >
      {priority}
    </span>
  );
}
