/**
 * GET /api/reports/daily-register
 *
 * Paginated daily meal register and summary metrics for selected business date.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getDailyRegister, getDailySummary } from "@/lib/reporting-service";
import { getProviderBusinessDate } from "@/lib/counter-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, providerTimezone } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;

  const dateParam = searchParams.get("date") || getProviderBusinessDate(providerTimezone || "Asia/Kolkata");
  const status = searchParams.get("status") || "ALL";
  const mealType = searchParams.get("mealType") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const [registerData, summaryData] = await Promise.all([
      getDailyRegister({
        providerId,
        businessDate: dateParam,
        status,
        mealType,
        page,
        limit,
        providerTimezone: providerTimezone || "Asia/Kolkata",
      }),
      getDailySummary(providerId, dateParam),
    ]);

    return NextResponse.json({
      ...registerData,
      summary: summaryData,
    });
  } catch (error) {
    console.error("[GET /api/reports/daily-register] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily register." },
      { status: 500 }
    );
  }
}
