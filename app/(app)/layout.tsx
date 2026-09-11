/**
 * Protected Application Layout
 *
 * This layout wraps all authenticated routes:
 * /counter, /customers, /subscriptions, /history, /reports, /settings, /dashboard
 *
 * Server-side auth check: redirects to /login if not authenticated.
 * Renders the sidebar (desktop) and top bar (mobile).
 *
 * UI/UX §4: "Persistent sidebar for management modules on desktop"
 * UI/UX §5: "Single-column layout on mobile"
 */

import { requireAuthServer } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "MealTrack",
    template: "%s | MealTrack",
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth guard — redirects to /login if not authenticated
  // This is the primary protection for all app routes
  await requireAuthServer();

  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <TopBar />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
