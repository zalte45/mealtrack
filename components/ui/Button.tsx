/**
 * Button — Reusable primary action component
 *
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 * States: disabled, loading
 *
 * Touch target minimum: 44px (UI/UX §9)
 * Keyboard-first: works with Enter/Space natively
 */

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 border-transparent shadow-sm",
  secondary:
    "bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border-slate-200 shadow-sm",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 border-transparent",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-transparent shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center",
          "font-medium rounded-lg border",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "select-none cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size={size === "sm" ? 12 : 16} />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

/* Inline spinner for button loading state */
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ minWidth: size }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="10"
        opacity="0.25"
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
