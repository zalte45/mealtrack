/**
 * Member ID generation service
 *
 * Business rules (from user requirements):
 * - Sequential starting from 1001
 * - Range: 1000–9999 (4 digits)
 * - Never recycle IDs of inactive/archived customers
 * - Auto-suggest next available, but validate before assigning
 * - Unique constraint enforced at DB level (fallback safety)
 *
 * Design: flexible strategy pattern — can swap to random/hash later
 * without changing the calling code.
 */

import { db } from "@/lib/db";

const MEMBER_ID_MIN = 1000;
const MEMBER_ID_MAX = 9999;
const MEMBER_ID_START = 1001;

export type MemberIdStrategy = "sequential";

/**
 * Find the next available Member ID for a provider.
 *
 * Strategy: sequential from 1001.
 * - Queries the highest existing memberId4 for this provider
 * - Suggests max+1, skipping gaps (safer than fill-gaps which could recycle)
 * - Returns the suggestion as a string, e.g. "1001"
 *
 * The caller MUST validate the suggestion is still available before saving
 * (the DB unique constraint is the final safety net).
 */
export async function suggestNextMemberId(
  providerId: string,
  // Strategy parameter reserved for future: sequential | random | custom
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strategy: MemberIdStrategy = "sequential"
): Promise<string | null> {
  // Find the highest existing memberId4 for this provider
  // We include ALL statuses (ACTIVE + ARCHIVED) to never recycle IDs
  const highestCustomer = await db.customer.findFirst({
    where: {
      providerId,
      // memberId4 is a string, but sorts lexicographically for 4-digit strings
      // We sort by memberId4 descending to get the highest
    },
    orderBy: {
      memberId4: "desc",
    },
    select: {
      memberId4: true,
    },
  });

  if (!highestCustomer) {
    // No customers yet — start at 1001
    return MEMBER_ID_START.toString().padStart(4, "0");
  }

  const highest = parseInt(highestCustomer.memberId4, 10);

  if (isNaN(highest)) {
    return MEMBER_ID_START.toString().padStart(4, "0");
  }

  const next = highest + 1;

  if (next > MEMBER_ID_MAX) {
    // Exhausted sequential range — would need a different strategy
    // Return null to signal that auto-suggestion is unavailable
    return null;
  }

  return next.toString().padStart(4, "0");
}

/**
 * Check if a given memberId4 is available for a provider.
 * Used for pre-validation before saving.
 *
 * Returns true if available (not taken by any customer, any status).
 */
export async function isMemberIdAvailable(
  providerId: string,
  memberId4: string
): Promise<boolean> {
  const existing = await db.customer.findUnique({
    where: {
      providerId_memberId4: {
        providerId,
        memberId4,
      },
    },
    select: { id: true },
  });

  return existing === null;
}

/**
 * Validate the format of a memberId4 string.
 * Must be exactly 4 digits, 1000–9999.
 */
export function isValidMemberIdFormat(memberId4: string): boolean {
  if (!/^\d{4}$/.test(memberId4)) return false;
  const num = parseInt(memberId4, 10);
  return num >= MEMBER_ID_MIN && num <= MEMBER_ID_MAX;
}
