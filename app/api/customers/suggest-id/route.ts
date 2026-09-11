/**
 * GET /api/customers/suggest-id
 *
 * Suggests the next available 4-digit Member ID for the authenticated provider.
 * Starts from 1001 and increments sequentially.
 * Includes both ACTIVE and ARCHIVED customers so old IDs are NEVER recycled.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { suggestNextMemberId } from "@/lib/member-id";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const suggestedId = await suggestNextMemberId(auth.session.user.providerId);

    if (!suggestedId) {
      return NextResponse.json(
        {
          error: "Member ID sequential range exhausted (1000–9999). Please enter a 4-digit ID manually.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ suggestedId });
  } catch (error) {
    console.error("[GET /api/customers/suggest-id] Error:", error);
    return NextResponse.json(
      { error: "Failed to suggest Member ID." },
      { status: 500 }
    );
  }
}
