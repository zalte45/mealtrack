/**
 * Spinner — Loading indicator
 */

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = "" }: SpinnerProps) {
  return (
    <svg
      aria-label="Loading"
      role="status"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={["animate-spin text-indigo-600", className].filter(Boolean).join(" ")}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
