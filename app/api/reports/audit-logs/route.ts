/**
 * GET /api/reports/audit-logs
 *
 * Immutable audit trail viewer for administrative and operational actions.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getAuditLogs } from "@/lib/reporting-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const action = searchParams.get("action") || undefined;

  try {
    const logs = await getAuditLogs(providerId, page, limit, action);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[GET /api/reports/audit-logs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}
