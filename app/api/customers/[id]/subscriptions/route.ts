/**
 * /api/customers/[id]/subscriptions
 *
 * GET - Returns all historical and active subscriptions for a customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { calculateSubscriptionStatus } from "@/lib/subscription-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId } = auth.session.user;

  try {
    const customer = await db.customer.findFirst({
      where: { id, providerId },
      select: { id: true, name: true, memberId4: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const subscriptions = await db.subscription.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { id: true, name: true } },
        mealRecords: {
          where: { status: "VALID" },
          select: { id: true },
        },
      },
    });

    const formattedHistory = subscriptions.map((sub) => {
      const usedMeals = sub.mealRecords.length;
      const calculatedStatus = calculateSubscriptionStatus({
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        quota: sub.quota,
        usedMeals,
      });

      return {
        id: sub.id,
        customerId: sub.customerId,
        planId: sub.planId,
        startDate: sub.startDate,
        endDate: sub.endDate,
        quota: sub.quota,
        mealsPerDay: sub.mealsPerDay,
        price: Number(sub.price),
        paymentStatus: sub.paymentStatus,
        status: sub.status,
        notes: sub.notes,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        plan: sub.plan,
        usedMeals,
        remainingMeals: Math.max(0, sub.quota - usedMeals),
        calculatedStatus,
      };
    });

    return NextResponse.json({
      customer,
      subscriptions: formattedHistory,
    });
  } catch (error) {
    console.error(`[GET /api/customers/${id}/subscriptions] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch customer subscription history." },
      { status: 500 }
    );
  }
}
