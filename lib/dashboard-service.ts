/**
 * MealTrack Operational Dashboard Aggregation Service
 *
 * Source of truth: SRS §3.5 + Architecture §6 Database Integrity
 *
 * All metrics derive strictly from the authoritative database tables:
 * - VALID MealRecords count towards today's consumed total.
 * - VOIDED MealRecords are tracked separately and excluded from consumption.
 * - Dates use the provider's configured local timezone (e.g. "Asia/Kolkata").
 * - Strict provider/tenant isolation on every query.
 */

import { db } from "@/lib/db";
import { getProviderBusinessDate } from "@/lib/counter-service";

export interface DashboardOverview {
  businessDate: string;
  todayValidMeals: number;
  todayVoidedMeals: number;
  activeCustomersCount: number;
  activeSubscriptionsCount: number;
  lowBalanceSubscriptions: Array<{
    id: string;
    memberId4: string;
    customerName: string;
    planName: string;
    quota: number;
    usedMeals: number;
    remainingMeals: number;
  }>;
  expiringSubscriptions: Array<{
    id: string;
    memberId4: string;
    customerName: string;
    planName: string;
    endDate: string;
    remainingMeals: number;
  }>;
  recentActivity: Array<{
    id: string;
    consumedAt: string;
    memberId4: string;
    customerName: string;
    planName: string;
    status: string;
    recordedBy: string;
  }>;
}

export async function getDashboardOverview(
  providerId: string,
  providerTimezone = "Asia/Kolkata"
): Promise<DashboardOverview> {
  const businessDate = getProviderBusinessDate(providerTimezone);

  // Compute 7-day expiration horizon
  const todayDate = new Date();
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);

  const [
    todayValidMeals,
    todayVoidedMeals,
    activeCustomersCount,
    activeSubscriptionsCount,
    activeSubscriptionsWithRecords,
    recentMealRecords,
  ] = await Promise.all([
    // 1. Today's Valid Meals
    db.mealRecord.count({
      where: {
        customer: { providerId },
        businessDate,
        status: "VALID",
      },
    }),

    // 2. Today's Voided Meals
    db.mealRecord.count({
      where: {
        customer: { providerId },
        businessDate,
        status: "VOIDED",
      },
    }),

    // 3. Active Customers Count
    db.customer.count({
      where: {
        providerId,
        status: "ACTIVE",
      },
    }),

    // 4. Active Subscriptions Count
    db.subscription.count({
      where: {
        customer: { providerId },
        status: "ACTIVE",
      },
    }),

    // 5. Active Subscriptions with Meal Record Counts (for low balance & expiring alerts)
    db.subscription.findMany({
      where: {
        customer: { providerId },
        status: "ACTIVE",
      },
      include: {
        customer: { select: { id: true, memberId4: true, name: true } },
        plan: { select: { name: true } },
        mealRecords: {
          where: { status: "VALID" },
          select: { id: true },
        },
      },
      take: 200, // Limit to 200 active subs for performance
    }),

    // 6. Recent Meal Activity Today (Top 5)
    db.mealRecord.findMany({
      where: {
        customer: { providerId },
        businessDate,
      },
      take: 5,
      orderBy: { consumedAt: "desc" },
      include: {
        customer: { select: { memberId4: true, name: true } },
        subscription: { select: { plan: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  // Process Low Balance & Expiring subscriptions
  const lowBalanceSubscriptions: DashboardOverview["lowBalanceSubscriptions"] = [];
  const expiringSubscriptions: DashboardOverview["expiringSubscriptions"] = [];

  for (const sub of activeSubscriptionsWithRecords) {
    const usedMeals = sub.mealRecords.length;
    const remainingMeals = Math.max(0, sub.quota - usedMeals);

    // Low balance alert: 3 or fewer meals remaining
    if (remainingMeals > 0 && remainingMeals <= 3) {
      lowBalanceSubscriptions.push({
        id: sub.id,
        memberId4: sub.customer.memberId4,
        customerName: sub.customer.name,
        planName: sub.plan?.name || "Custom Plan",
        quota: sub.quota,
        usedMeals,
        remainingMeals,
      });
    }

    // Expiring soon alert: end date within next 7 days
    if (sub.endDate) {
      const end = new Date(sub.endDate);
      if (end >= todayDate && end <= next7Days) {
        expiringSubscriptions.push({
          id: sub.id,
          memberId4: sub.customer.memberId4,
          customerName: sub.customer.name,
          planName: sub.plan?.name || "Custom Plan",
          endDate: sub.endDate.toISOString().split("T")[0],
          remainingMeals,
        });
      }
    }
  }

  // Format recent activity
  const recentActivity: DashboardOverview["recentActivity"] = recentMealRecords.map((r) => ({
    id: r.id,
    consumedAt: r.consumedAt.toISOString(),
    memberId4: r.customer.memberId4,
    customerName: r.customer.name,
    planName: r.subscription.plan?.name || "Custom Plan",
    status: r.status,
    recordedBy: r.recordedBy.name,
  }));

  return {
    businessDate,
    todayValidMeals,
    todayVoidedMeals,
    activeCustomersCount,
    activeSubscriptionsCount,
    lowBalanceSubscriptions: lowBalanceSubscriptions.slice(0, 10),
    expiringSubscriptions: expiringSubscriptions.slice(0, 10),
    recentActivity,
  };
}
