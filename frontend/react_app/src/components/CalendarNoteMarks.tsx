/** Золотой уголок заметки на плитке месяца. */
export function MonthNoteCorner() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[2] h-3 w-3 bg-[var(--calendar-note-frame)]"
      style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
    />
  );
}

/** Золотая полоска под числом дня в сетке года. */
export function YearNoteUnderline() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-0.5 left-1/2 z-[2] h-[1.5px] w-2.5 -translate-x-1/2 rounded-full bg-[var(--calendar-note-frame)]"
    />
  );
}

/** Нимб текущего дня на году: то же золото, кольцо крупнее, чтобы цифра была внутри. */
export function YearTodayHalo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={30}
      height={30}
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
