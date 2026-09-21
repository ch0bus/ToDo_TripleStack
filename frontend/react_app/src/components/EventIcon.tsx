export function EventIcon({
  color,
  className = "h-4 w-4 shrink-0",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 11h16" />
    </svg>
  );
}
