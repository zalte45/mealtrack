/**
 * /api/subscriptions/[id]
 *
 * GET   - Fetch single subscription with ledger details & calculated balance.
 * PATCH - Update subscription (paymentStatus, status, notes).
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
    const subscription = await db.subscription.findFirst({
      where: {
        id,
        customer: { providerId },
      },
      include: {
        customer: {
          select: { id: true, memberId4: true, name: true, mobile: true },
        },
        plan: { select: { id: true, name: true } },
        mealRecords: {
          orderBy: { consumedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 }
      );
    }

    const validMealRecords = subscription.mealRecords.filter((r) => r.status === "VALID");
    const usedMeals = validMealRecords.length;
    const calculatedStatus = calculateSubscriptionStatus({
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      quota: subscription.quota,
      usedMeals,
    });

    return NextResponse.json({
      subscription: {
        ...subscription,
        price: Number(subscription.price),
        usedMeals,
        remainingMeals: Math.max(0, subscription.quota - usedMeals),
        calculatedStatus,
      },
    });
  } catch (error) {
    console.error(`[GET /api/subscriptions/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId, id: userId } = auth.session.user;

  try {
    const body = await req.json();

    const existing = await db.subscription.findFirst({
      where: {
        id,
        customer: { providerId },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found or unauthorized." },
        { status: 404 }
      );
    }

    const { paymentStatus, status, notes } = body;

    const updated = await db.subscription.update({
      where: { id },
      data: {
        ...(paymentStatus && { paymentStatus }),
        ...(status && { status }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        customer: {
          select: { id: true, memberId4: true, name: true },
        },
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: status && status !== existing.status ? `SUBSCRIPTION_STATUS_${status}` : "SUBSCRIPTION_UPDATED",
        entity: "Subscription",
        entityId: id,
        metadata: {
          previousStatus: existing.status,
          newStatus: updated.status,
          paymentStatus: updated.paymentStatus,
        },
      },
    });

    return NextResponse.json({
      subscription: {
        ...updated,
        price: Number(updated.price),
      },
    });
  } catch (error) {
    console.error(`[PATCH /api/subscriptions/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update subscription." },
      { status: 500 }
    );
  }
}
