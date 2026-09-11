"use client";

/**
 * Top Bar — Mobile/tablet header
 *
 * Shown on smaller screens where sidebar is hidden.
 * Contains: hamburger menu, page title, user avatar/menu.
 */

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sidebar } from "./Sidebar";

interface TopBarProps {
  pageTitle?: string;
}

export function TopBar({ pageTitle }: TopBarProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-slate-200 px-4 h-14 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={sidebarOpen}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand + page title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
            aria-hidden="true"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900 truncate">
            {pageTitle ?? "MealTrack"}
          </span>
        </div>

        {/* User initials avatar */}
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label={`Signed in as ${session.user.name}. Click to sign out.`}
            title="Sign out"
            className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 hover:bg-indigo-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
          >
            {session.user.name.charAt(0).toUpperCase()}
          </button>
        )}
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="relative z-50 flex flex-col h-full animate-slide-in">
            <Sidebar />
          </div>
          {/* Close button */}
          <div className="relative z-50 ml-auto p-2">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
