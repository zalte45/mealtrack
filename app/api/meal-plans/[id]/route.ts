/**
 * /api/meal-plans/[id]
 *
 * PATCH  - Update meal plan template details or toggle active/archived status.
 * DELETE - Soft-delete (archive) meal plan template.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId, id: userId } = auth.session.user;

  try {
    const body = await req.json();

    const existing = await db.mealPlan.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan not found." },
        { status: 404 }
      );
    }

    const { name, quota, mealsPerDay, validityDays, price, status } = body;

    const updated = await db.mealPlan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(quota !== undefined && { quota: Number(quota) }),
        ...(mealsPerDay !== undefined && { mealsPerDay: Number(mealsPerDay) }),
        ...(validityDays !== undefined && { validityDays: validityDays ? Number(validityDays) : null }),
        ...(price !== undefined && { price: Number(price) }),
        ...(status && { status }),
      },
    });

    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "MEAL_PLAN_UPDATED",
        entity: "MealPlan",
        entityId: id,
        metadata: { name: updated.name, status: updated.status },
      },
    });

    return NextResponse.json({
      mealPlan: { ...updated, price: Number(updated.price) },
    });
  } catch (error) {
    console.error(`[PATCH /api/meal-plans/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update meal plan." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId, id: userId } = auth.session.user;

  try {
    const existing = await db.mealPlan.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan not found." },
        { status: 404 }
      );
    }

    const archived = await db.mealPlan.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "MEAL_PLAN_ARCHIVED",
        entity: "MealPlan",
        entityId: id,
      },
    });

    return NextResponse.json({
      message: "Meal plan template archived.",
      mealPlan: { ...archived, price: Number(archived.price) },
    });
  } catch (error) {
    console.error(`[DELETE /api/meal-plans/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to archive meal plan." },
      { status: 500 }
    );
  }
}
