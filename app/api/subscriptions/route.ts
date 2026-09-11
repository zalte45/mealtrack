/**
 * /api/subscriptions
 *
 * GET  - List subscriptions for authenticated provider with filters & search.
 * POST - Create a new subscription for a customer (Snapshot pattern, multi-subscription history).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CreateSubscriptionSchema } from "@/lib/validations";
import { calculateSubscriptionStatus, calculateEndDate } from "@/lib/subscription-helpers";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;

  const q = searchParams.get("q")?.trim() || "";
  const statusFilter = searchParams.get("status") || "ALL"; // ALL | ACTIVE | EXPIRED | CANCELLED
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  // Tenant-scoped filter through Customer relation
  const where: Prisma.SubscriptionWhereInput = {
    customer: {
      providerId,
    },
  };

  if (statusFilter === "ACTIVE" || statusFilter === "EXPIRED" || statusFilter === "CANCELLED") {
    where.status = statusFilter;
  }

  if (q) {
    where.customer = {
      providerId,
      OR: [
        { memberId4: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  try {
    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              memberId4: true,
              name: true,
              mobile: true,
              status: true,
            },
          },
          plan: {
            select: { id: true, name: true },
          },
          mealRecords: {
            where: { status: "VALID" },
            select: { id: true },
          },
        },
      }),
      db.subscription.count({ where }),
    ]);

    // Format subscriptions with dynamic state calculation
    const formattedSubscriptions = subscriptions.map((sub) => {
      const usedMeals = sub.mealRecords.length;
      const calculatedStatus = calculateSubscriptionStatus({
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        quota: sub.quota,
        usedMeals,
      });

      const remainingMeals = Math.max(0, sub.quota - usedMeals);

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
        customer: sub.customer,
        plan: sub.plan,
        usedMeals,
        remainingMeals,
        calculatedStatus,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("[GET /api/subscriptions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, id: userId } = auth.session.user;

  try {
    const body = await req.json();

    // 1. Validate payload with Zod
    const parsed = CreateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      customerId,
      planId,
      startDate,
      endDate: inputEndDate,
      quota,
      mealsPerDay,
      price,
      paymentStatus,
      notes,
    } = parsed.data;

    // 2. Validate Customer ownership & tenant boundary
    const customer = await db.customer.findFirst({
      where: { id: customerId, providerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or unauthorized." },
        { status: 404 }
      );
    }

    // 3. Optional: Validate plan template if planId provided
    let calculatedEndDate = inputEndDate || null;
    if (planId) {
      const plan = await db.mealPlan.findFirst({
        where: { id: planId, providerId },
      });
      if (plan && !inputEndDate && plan.validityDays) {
        calculatedEndDate = calculateEndDate(startDate, plan.validityDays);
      }
    }

    // 4. Create subscription (Snapshot architecture — stores copy of quota, price, dates)
    const subscription = await db.subscription.create({
      data: {
        customerId,
        planId: planId || null,
        startDate: new Date(startDate),
        endDate: calculatedEndDate ? new Date(calculatedEndDate) : null,
        quota,
        mealsPerDay: mealsPerDay || 1,
        price,
        paymentStatus: paymentStatus || "PENDING",
        status: "ACTIVE",
        notes: notes || null,
      },
      include: {
        customer: {
          select: { id: true, memberId4: true, name: true },
        },
        plan: {
          select: { id: true, name: true },
        },
      },
    });

    // 5. Audit Log
    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "SUBSCRIPTION_CREATED",
        entity: "Subscription",
        entityId: subscription.id,
        metadata: {
          customerId: customer.id,
          memberId4: customer.memberId4,
          quota: subscription.quota,
          price: Number(subscription.price),
        },
      },
    });

    return NextResponse.json(
      {
        subscription: {
          ...subscription,
          price: Number(subscription.price),
          usedMeals: 0,
          remainingMeals: subscription.quota,
          calculatedStatus: "ACTIVE",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/subscriptions] Error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription." },
      { status: 500 }
    );
  }
}
