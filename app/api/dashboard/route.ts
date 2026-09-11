/**
 * GET /api/dashboard
 *
 * Fast aggregated operational metrics for the Provider Overview Dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getDashboardOverview } from "@/lib/dashboard-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, providerTimezone } = auth.session.user;

  try {
    const overview = await getDashboardOverview(
      providerId,
      providerTimezone || "Asia/Kolkata"
    );

    return NextResponse.json(overview);
  } catch (error) {
    console.error("[GET /api/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard overview." },
      { status: 500 }
    );
  }
}
