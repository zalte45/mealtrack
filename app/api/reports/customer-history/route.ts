/**
 * GET /api/reports/customer-history
 *
 * Ledger history for a specific customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getCustomerMealHistory } from "@/lib/reporting-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;

  const customerId = searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId query parameter is required." },
      { status: 400 }
    );
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const history = await getCustomerMealHistory(providerId, customerId, page, limit);
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch customer history.";
    console.error("[GET /api/reports/customer-history] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
