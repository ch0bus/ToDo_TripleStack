import type { ReactNode } from "react";

import { cardClass } from "@/lib/uiClasses";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="px-0.5">
        <h2 className="text-sm font-semibold text-app">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-app-muted">{description}</p>
        ) : null}
      </div>
      <div className={"p-5 " + cardClass}>{children}</div>
    </section>
  );
}
