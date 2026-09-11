"use client";

/**
 * Sidebar Navigation — MealTrack
 *
 * UI/UX §2: Navigation items
 * UI/UX §4: "Persistent sidebar for management modules" (desktop)
 * UI/UX §5: Mobile uses bottom nav / collapsible sidebar
 *
 * Navigation items:
 * - Meal Counter (home, P0)
 * - Dashboard (P1)
 * - Customers (P0)
 * - Subscriptions (P0)
 * - Meal History (P0)
 * - Reports (P1)
 * - Settings (OWNER only)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/counter",
    label: "Meal Counter",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
        <path d="M18 22v-3" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/customers",
    label: "Customers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Meal History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    ownerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || isOwner
  );

  return (
    <aside
      className="w-[240px] bg-slate-900 flex flex-col h-full flex-shrink-0"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">MealTrack</p>
            {session?.user?.providerName && (
              <p className="text-xs text-slate-400 truncate">
                {session.user.providerName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Sidebar navigation">
        <ul className="flex flex-col gap-0.5" role="list">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/counter"
                ? pathname === "/counter"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "text-sm font-medium transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-400",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.href === "/counter" && (
                    <span
                      className="ml-auto text-[10px] font-semibold bg-indigo-400 text-white px-1.5 py-0.5 rounded-full"
                      aria-label="Main screen"
                    >
                      HOME
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + Sign out */}
      <div className="px-3 py-4 border-t border-slate-800">
        {session?.user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-white truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium text-indigo-300 bg-indigo-900 px-1.5 py-0.5 rounded-full">
              {session.user.role}
            </span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-400"
          aria-label="Sign out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
