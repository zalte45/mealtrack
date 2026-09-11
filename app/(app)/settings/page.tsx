/**
 * Settings page — OWNER only
 *
 * Server-component with OWNER role check.
 * Staff members who navigate here will be redirected.
 */

import type { Metadata } from "next";
import { requireOwnerServer } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  // Enforce OWNER-only access server-side
  const session = await requireOwnerServer();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-500 text-sm mb-4">
        Signed in as {session.user.name} ({session.user.role}).
      </p>
      <p className="text-slate-500 text-sm">
        Coming in Phase 12. Business profile, meal plans, staff management, and security settings.
      </p>
    </div>
  );
}
