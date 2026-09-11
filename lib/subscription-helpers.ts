/**
 * Subscription status & calculation helpers
 *
 * Business Rules:
 * - Subscriptions snapshot plan values at creation time (BR-006)
 * - Quota & validity are fully configurable (no hardcoded 30 days = 30 meals rule)
 * - Expiry occurs when calendar endDate has passed (if endDate is specified)
 * - Exhaustion occurs when used meals reach or exceed quota
 * - Missing a day does NOT automatically consume a meal
 */

export type CalculatedSubscriptionStatus =
  | "ACTIVE"
  | "EXHAUSTED"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING_START";

export interface SubscriptionStatusInput {
  status: string; // Stored DB status: ACTIVE | EXPIRED | CANCELLED
  startDate: Date | string;
  endDate?: Date | string | null;
  quota: number;
  usedMeals: number;
}

/**
 * Calculates the exact dynamic state of a subscription taking into account:
 * - DB status (e.g., if explicitly CANCELLED)
 * - Used meals vs Quota (EXHAUSTED)
 * - Current date vs End Date (EXPIRED)
 * - Current date vs Start Date (PENDING_START)
 */
export function calculateSubscriptionStatus(
  sub: SubscriptionStatusInput,
  referenceDate: Date = new Date()
): CalculatedSubscriptionStatus {
  if (sub.status === "CANCELLED") {
    return "CANCELLED";
  }

  // Normalize reference date to start of day (00:00:00) in local comparison
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const start = new Date(sub.startDate);
  start.setHours(0, 0, 0, 0);

  if (start > today) {
    return "PENDING_START";
  }

  if (sub.usedMeals >= sub.quota) {
    return "EXHAUSTED";
  }

  if (sub.endDate) {
    const end = new Date(sub.endDate);
    end.setHours(23, 59, 59, 999);
    if (end < today) {
      return "EXPIRED";
    }
  }

  return "ACTIVE";
}

/**
 * Calculates end date from start date and validity days.
 * E.g., Start: 2026-09-01, Validity: 30 days -> End Date: 2026-09-30 (inclusive)
 */
export function calculateEndDate(
  startDateStr: string,
  validityDays: number | null | undefined
): string | null {
  if (!validityDays || validityDays <= 0) {
    return null;
  }

  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) {
    return null;
  }

  // Inclusive end date: add (validityDays - 1) days
  const end = new Date(start);
  end.setDate(end.getDate() + validityDays - 1);

  return end.toISOString().split("T")[0];
}

/**
 * Calculates remaining meals from quota and used meals count.
 */
export function calculateRemainingMeals(quota: number, usedMeals: number): number {
  return Math.max(0, quota - usedMeals);
}
