/** Нимб текущего дня: то же золото, что в логотипе, кольцо вокруг числа. */
export function TodayHalo({ size = 30 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className="brand-halo-ring pointer-events-none absolute left-1/2 top-1/2 z-[2] m-0 -translate-x-1/2 -translate-y-1/2"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.38"
      />
      <circle cx="12" cy="12" r="8.55" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
