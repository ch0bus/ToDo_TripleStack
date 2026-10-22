/** Монетки справа от числа: на дне есть доплата. Не кнопка. */
export function ShiftBonusMark({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      aria-hidden
      className={"shrink-0 text-[var(--calendar-note-frame)] " + className}
    >
      <circle cx="6" cy="9.2" r="4.1" fill="currentColor" opacity="0.45" />
      <circle cx="9.6" cy="6.4" r="4.3" fill="currentColor" />
      <circle
        cx="9.6"
        cy="6.4"
        r="2.7"
        stroke="white"
        strokeWidth="0.9"
        opacity="0.55"
      />
    </svg>
  );
}

/** Золотая чёрточка у числа: на дне есть заметка. Не нимб «сегодня». */
export function DayNoteMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "pointer-events-none absolute bottom-0.5 left-1/2 z-[2] h-0.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--calendar-note-frame)] " +
        className
      }
      aria-hidden
    />
  );
}

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
