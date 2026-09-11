/**
 * POST /api/counter/void
 *
 * Soft-voids a meal record (preserves audit trail, restores balance).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { voidMealRecord } from "@/lib/counter-service";
import { VoidMealSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, id: userId } = auth.session.user;

  try {
    const body = await req.json();

    const parsed = VoidMealSchema.safeParse(body);
    if (!parsed.success || !body.mealRecordId) {
      return NextResponse.json(
        { error: "Please provide a valid meal record ID and reason (min 3 chars)." },
        { status: 400 }
      );
    }

    const { mealRecordId, reason } = body;

    const result = await voidMealRecord(providerId, userId, mealRecordId, reason);

    return NextResponse.json({
      success: true,
      message: "Meal record voided. Customer balance restored.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to void meal record.";
    console.error("[POST /api/counter/void] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
