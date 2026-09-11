"use client";

/**
 * Login Page — MealTrack
 *
 * UI/UX §6 Screen Inventory: "Username/email, password, sign in, error"
 * UI/UX §7 Interaction Rules:
 *   - Keyboard-friendly (Enter submits)
 *   - Clear error message on failure
 *   - Disable button during submission
 *   - Never show success before server confirmation
 *
 * Authentication:
 *   - Calls NextAuth signIn('credentials', ...)
 *   - On success: redirects to /counter (Meal Counter home)
 *   - On failure: shows a clear, user-friendly error
 */

import { Suspense, useState, useRef, useEffect, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Derive URL error message synchronously (not in an effect)
  const urlErrorParam = searchParams.get("error");
  const urlErrorMessage =
    urlErrorParam === "SessionRequired"
      ? "Your session has expired. Please sign in again."
      : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false, // Handle redirect manually for better error UX
      });

      if (!result) {
        setError("Unable to connect to the server. Please try again.");
        return;
      }

      if (result.error) {
        // Map NextAuth error codes to user-friendly messages
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please check and try again.");
        } else if (result.error === "AccessDenied") {
          setError("Your account has been suspended. Please contact the owner.");
        } else {
          setError("Unable to sign in. Please try again.");
        }
        return;
      }

      if (result.ok) {
        // Successful login — go to Meal Counter (operational home)
        router.push("/counter");
        router.refresh();
      }
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter your credentials to access MealTrack
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign in form"
        >
          <div className="flex flex-col gap-4">
            {/* Error alert — shows URL session errors or form submit errors */}
            {(error ?? urlErrorMessage) && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 animate-fade-in"
              >
                <svg
                  aria-hidden="true"
                  className="flex-shrink-0 mt-0.5"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error ?? urlErrorMessage}</span>
              </div>
            )}

            {/* Email */}
            <Input
              ref={emailRef}
              id="login-email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              leftIcon={
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              }
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-slate-700 select-none"
              >
                Password
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 pointer-events-none" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 pl-10 pr-10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              id="login-submit"
              className="mt-2"
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400 mt-6">
        MealTrack is a provider-only system.
        <br />
        Customers do not need an account.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm p-8 flex justify-center">
          <p className="text-sm text-slate-500 animate-pulse">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
