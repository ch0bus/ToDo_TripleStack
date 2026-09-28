export function ShiftLayerEyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      {hidden ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.4 5.2A9 9 0 0 1 12 5c5 0 9 4.5 10 7a11 11 0 0 1-1.7 2.6" />
          <path d="M6.6 6.6C4 8.4 2.5 11 2 12c1 2.5 5 7 10 7a9 9 0 0 0 4.2-1" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
