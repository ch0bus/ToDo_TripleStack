import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

export function MoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function EntityTile({
  className = "",
  stripeClassName,
  stripeStyle,
  overdue,
  dimmed,
  mark,
  title,
  titleTo,
  titleState,
  done,
  titleMuted,
  when,
  whenSub,
  status,
  statusShort,
  facts,
  tags,
  menu,
}: {
  className?: string;
  stripeClassName?: string;
  stripeStyle?: CSSProperties;
  overdue?: boolean;
  dimmed?: boolean;
  mark: ReactNode;
  title: string;
  titleTo: string;
  titleState?: object;
  done?: boolean;
  titleMuted?: boolean;
  when: string;
  whenSub?: string;
  status?: string;
  statusShort?: string;
  facts?: string;
  tags?: string[];
  menu?: ReactNode;
}) {
  return (
    <li
      className={
        "entity-tile group relative flex rounded-lg border bg-app-surface " +
        (overdue ? "todo-tile-overdue " : "") +
        (dimmed ? "opacity-70 " : "") +
        className
      }
    >
      <div
        className={"w-1 shrink-0 self-stretch rounded-l-lg " + (stripeClassName ?? "")}
        style={stripeStyle}
        aria-hidden
      />
      <div className="entity-tile-grid min-w-0 flex-1">
        <div className="entity-tile-mark flex items-center justify-center">
          {mark}
        </div>
        <Link
          to={titleTo}
          state={titleState}
          title={title}
          className={
            "entity-tile-title min-w-0 truncate text-[15px] font-medium leading-5 hover:text-app-accent " +
            (done
              ? "text-app-subtle line-through"
              : titleMuted
                ? "text-app-muted"
                : "text-app")
          }
        >
          {title}
        </Link>
        <div
          className={
            "entity-tile-status " +
            (overdue ? "text-[var(--app-danger)]" : "text-app-muted")
          }
          title={status}
        >
          {status ? (
            <>
              <span className="entity-tile-status-full">{status}</span>
              <span className="entity-tile-status-short">
                {statusShort || status}
              </span>
            </>
          ) : (
            "\u00a0"
          )}
        </div>
        <div
          className="entity-tile-when min-w-0 truncate text-right text-xs leading-4 text-app-subtle"
          title={[when, whenSub].filter(Boolean).join(" · ")}
        >
          {when || "\u00a0"}
        </div>
        <div className="entity-tile-menu flex items-center justify-end">{menu}</div>
        <p
          className="entity-tile-facts min-w-0 truncate text-[11px] leading-[18px] text-app-subtle"
          title={facts}
        >
          {facts || "\u00a0"}
        </p>
        <p
          className="entity-tile-due min-w-0 truncate text-right text-[11px] leading-[14px] text-app-subtle"
          title={whenSub}
        >
          {whenSub || "\u00a0"}
        </p>
        <div className="entity-tile-tags flex h-[22px] min-w-0 items-center gap-1 overflow-hidden">
          {(tags ?? []).map((tag) => (
            <span
              key={tag}
              className="chip-default shrink-0 rounded-full border px-1.5 py-px text-[11px] leading-4"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}
