/**
 * Auth layout — centered, clean, brand-focused
 * Used by /login and any future /forgot-password, /setup pages
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
        >
          {/* Fork + plate icon */}
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
            <path d="M18 22v-3" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            MealTrack
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Provider Meal Management
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}
