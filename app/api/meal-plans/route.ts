/**
 * /api/meal-plans
 *
 * GET  - List meal plan templates for authenticated provider.
 * POST - Create a new meal plan template (Quota & Validity are fully configurable).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CreateMealPlanSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;
  const includeArchived = searchParams.get("includeArchived") === "true";

  try {
    const mealPlans = await db.mealPlan.findMany({
      where: {
        providerId,
        ...(includeArchived ? {} : { status: "ACTIVE" }),
      },
      orderBy: { createdAt: "desc" },
    });

    // Format Prisma Decimal to number for JSON response
    const formattedPlans = mealPlans.map((plan) => ({
      ...plan,
      price: Number(plan.price),
    }));

    return NextResponse.json({ mealPlans: formattedPlans });
  } catch (error) {
    console.error("[GET /api/meal-plans] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plans." },
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

    // Validate payload with Zod
    const parsed = CreateMealPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, quota, mealsPerDay, validityDays, price } = parsed.data;

    const plan = await db.mealPlan.create({
      data: {
        providerId,
        name,
        quota,
        mealsPerDay: mealsPerDay || 1,
        validityDays: validityDays ?? null,
        price,
        status: "ACTIVE",
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "MEAL_PLAN_CREATED",
        entity: "MealPlan",
        entityId: plan.id,
        metadata: {
          name: plan.name,
          quota: plan.quota,
          price: Number(plan.price),
        },
      },
    });

    return NextResponse.json(
      { mealPlan: { ...plan, price: Number(plan.price) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/meal-plans] Error:", error);
    return NextResponse.json(
      { error: "Failed to create meal plan template." },
      { status: 500 }
    );
  }
}
