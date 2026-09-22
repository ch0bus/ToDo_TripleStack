export function EventIcon({
  color,
  attended = false,
  className = "h-4 w-4 shrink-0",
}: {
  color?: string;
  attended?: boolean;
  className?: string;
}) {
  const stroke = color || "currentColor";
  const check = color ? "#fff" : "var(--app-surface)";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        fill={attended ? stroke : "none"}
      />
      <path d="M8 3.5v4M16 3.5v4" />
      <path d="M4 11h16" stroke={attended ? check : stroke} />
      {attended ? (
        <path
          d="M8.2 16.1 10.8 18.4 16.4 12.8"
          stroke={check}
          strokeWidth="2.4"
        />
      ) : null}
    </svg>
  );
}
