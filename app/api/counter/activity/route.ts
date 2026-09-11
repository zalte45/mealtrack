/**
 * GET /api/counter/activity
 *
 * Compact recent activity register for today's recorded meals.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getProviderBusinessDate } from "@/lib/counter-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, providerTimezone } = auth.session.user;
  const businessDate = getProviderBusinessDate(providerTimezone || "Asia/Kolkata");

  try {
    const mealRecords = await db.mealRecord.findMany({
      where: {
        customer: { providerId },
        businessDate,
      },
      take: 25,
      orderBy: { consumedAt: "desc" },
      include: {
        customer: {
          select: { id: true, memberId4: true, name: true },
        },
        subscription: {
          select: { id: true, quota: true },
        },
        recordedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      businessDate,
      records: mealRecords,
    });
  } catch (error) {
    console.error("[GET /api/counter/activity] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's activity." },
      { status: 500 }
    );
  }
}
