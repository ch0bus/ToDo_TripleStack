interface BrandMarkProps {
  size?: "sm" | "lg";
  className?: string;
}

function HaloGlyph({ size }: { size: "sm" | "lg" }) {
  const px = size === "lg" ? "1.05em" : "0.92em";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      aria-hidden
      className="brand-halo-ring"
    >
      <circle
        cx="12"
        cy="12"
        r="9.2"
        stroke="currentColor"
        strokeWidth="1.15"
        opacity="0.38"
      />
      <circle cx="12" cy="12" r="6.15" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

export function BrandMark({ size = "sm", className = "" }: BrandMarkProps) {
  return (
    <span
      className={
        "brand-mark inline-flex items-center " +
        (size === "lg" ? "text-[1.75rem] leading-none" : "text-[1.35rem] leading-none") +
        (className ? ` ${className}` : "")
      }
    >
      <span aria-hidden="true" className="inline-flex items-center">
        Hal
        <HaloGlyph size={size} />
        day
      </span>
    </span>
  );
}
