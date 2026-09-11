/**
 * POST /api/counter/record
 *
 * Transaction-safe meal recording.
 * Decrements dynamic balance by inserting a VALID MealRecord entry into the ledger.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { recordMealForCustomer } from "@/lib/counter-service";
import { RecordMealSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, id: userId, providerTimezone } = auth.session.user;

  try {
    const body = await req.json();

    const parsed = RecordMealSchema.partial().safeParse(body);
    if (!parsed.success || !body.customerId || !body.subscriptionId) {
      return NextResponse.json(
        { error: "Invalid request payload. customerId and subscriptionId are required." },
        { status: 400 }
      );
    }

    const { customerId, subscriptionId, mealType, idempotencyKey: bodyKey } = body;
    const headerKey = req.headers.get("x-idempotency-key");
    const idempotencyKey = bodyKey || headerKey || undefined;

    const result = await recordMealForCustomer(
      providerId,
      userId,
      customerId,
      subscriptionId,
      mealType,
      providerTimezone || "Asia/Kolkata",
      idempotencyKey
    );

    return NextResponse.json({
      success: true,
      message: "Meal successfully recorded.",
      ...result,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A meal has already been recorded for this customer today." },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to record meal.";
    console.error("[POST /api/counter/record] Error:", message);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
