/**
 * POST /api/counter/lookup
 *
 * Fast 4-digit Member ID lookup for the Meal Counter.
 * Returns concise customer summary & active subscription remaining entitlement.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { lookupCustomerForCounter } from "@/lib/counter-service";
import { MealLookupSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, providerTimezone } = auth.session.user;

  try {
    const body = await req.json();

    const parsed = MealLookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Member ID must be exactly 4 numeric digits (1000–9999)." },
        { status: 400 }
      );
    }

    const { memberId4 } = parsed.data;

    const result = await lookupCustomerForCounter(
      providerId,
      memberId4,
      providerTimezone || "Asia/Kolkata"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/counter/lookup] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during Member ID lookup." },
      { status: 500 }
    );
  }
}
