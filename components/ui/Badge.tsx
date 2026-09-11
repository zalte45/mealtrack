/**
 * Badge — Status indicator chip
 */

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "primary";

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error:   "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
  primary: "bg-indigo-100 text-indigo-700",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5",
        "rounded-full text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
