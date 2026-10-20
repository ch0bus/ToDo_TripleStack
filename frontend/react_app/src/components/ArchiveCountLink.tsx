import { Link } from "react-router-dom";

export function ArchiveCountLink({
  to,
  label,
  count,
  state,
}: {
  to: string;
  label: string;
  count: number;
  state?: object;
}) {
  const className =
    "shrink-0 text-sm font-normal normal-case tracking-normal ";
  if (count <= 0) {
    return (
      <span className={className + "text-app-subtle"}>
        {label} 0
      </span>
    );
  }
  return (
    <Link
      to={to}
      state={state}
      className={className + "text-app-accent hover:underline"}
    >
      {label} {count}
    </Link>
  );
}
