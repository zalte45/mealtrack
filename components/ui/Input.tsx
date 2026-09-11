/**
 * Input — Reusable form input with label, error, and helper text
 *
 * Accessibility:
 * - Label always associated via htmlFor/id
 * - aria-invalid when error present
 * - aria-describedby for error/helper messages
 */

import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helper,
      leftIcon,
      rightIcon,
      id: propId,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const describedBy = [
      error ? errorId : "",
      helper && !error ? helperId : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-700 select-none"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div
              className="absolute left-3 text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={[
              "w-full rounded-lg border bg-white",
              "text-sm text-slate-900 placeholder:text-slate-400",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
              "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
              error
                ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                : "border-slate-200 hover:border-slate-300",
              leftIcon ? "pl-10" : "pl-3",
              rightIcon ? "pr-10" : "pr-3",
              "h-10",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {rightIcon && (
            <div
              className="absolute right-3 text-slate-400"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-red-600 flex items-center gap-1"
          >
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}

        {helper && !error && (
          <p id={helperId} className="text-xs text-slate-500">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
