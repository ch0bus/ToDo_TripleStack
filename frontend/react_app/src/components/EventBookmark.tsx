interface EventBookmarkProps {
  color: string;
  index?: number;
}

/** Закладка, свисающая с верхнего правого угла ячейки месяца. */
export function EventBookmark({ color, index = 0 }: EventBookmarkProps) {
  return (
    <svg
      className="pointer-events-none absolute top-0 z-[2]"
      style={{ right: 3 + index * 7 }}
      width="11"
      height="16"
      viewBox="0 0 11 16"
      aria-hidden
    >
      <path d="M0 0h11v14.2L5.5 10.4 0 14.2V0z" fill={color} />
      <path d="M0 0h11v1.4H0z" fill="rgb(0 0 0 / 0.2)" />
    </svg>
  );
}
