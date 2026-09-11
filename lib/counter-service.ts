/**
 * Meal Counter Core Service
 *
 * Source of truth: SRS §3.1, §3.4 + Architecture §6 Database Integrity
 *
 * Business Rules:
 * - Ledger-first balance: remaining = quota - count(VALID meal records)
 * - Timezone-safe businessDate calculation (provider's local date, e.g. "YYYY-MM-DD")
 * - Server is source of truth for subscription validity & mealsPerDay rules
 * - Transactions & DB unique constraints protect against concurrent double recording
 */

import { db } from "@/lib/db";
import { calculateSubscriptionStatus } from "@/lib/subscription-helpers";

const selectCustomerFields = { select: { name: true, memberId4: true } };

/**
 * Returns today's business date string "YYYY-MM-DD" in provider timezone (default Asia/Kolkata)
 */
export function getProviderBusinessDate(timezone = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); // Formats as YYYY-MM-DD
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split("T")[0];
  }
}

export type CounterLookupStatus =
  | "VALID"
  | "NOT_FOUND"
  | "CUSTOMER_ARCHIVED"
  | "NO_ACTIVE_SUBSCRIPTION"
  | "EXHAUSTED_QUOTA"
  | "EXPIRED_SUBSCRIPTION"
  | "DAILY_LIMIT_REACHED";

export interface CounterLookupResult {
  status: CounterLookupStatus;
  message?: string;
  customer?: {
    id: string;
    memberId4: string;
    name: string;
    mobile: string | null;
    notes: string | null;
  };
  subscription?: {
    id: string;
    planName: string;
    quota: number;
    mealsPerDay: number;
    startDate: string;
    endDate: string | null;
    usedMeals: number;
    remainingMeals: number;
    consumedTodayCount: number;
  };
}

/**
 * Fast tenant-isolated customer lookup by 4-digit Member ID
 */
export async function lookupCustomerForCounter(
  providerId: string,
  memberId4: string,
  providerTimezone = "Asia/Kolkata"
): Promise<CounterLookupResult> {
  const businessDate = getProviderBusinessDate(providerTimezone);

  // 1. Fetch customer scoped by providerId
  const customer = await db.customer.findUnique({
    where: {
      providerId_memberId4: {
        providerId,
        memberId4,
      },
    },
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          plan: { select: { name: true } },
          mealRecords: {
            where: { status: "VALID" },
            select: { id: true, businessDate: true },
          },
        },
      },
    },
  });

  if (!customer) {
    return {
      status: "NOT_FOUND",
      message: `Member ID #${memberId4} not found.`,
    };
  }

  if (customer.status === "ARCHIVED") {
    return {
      status: "CUSTOMER_ARCHIVED",
      message: `Customer #${memberId4} (${customer.name}) is archived.`,
    };
  }

  const activeSub = customer.subscriptions[0] || null;

  if (!activeSub) {
    return {
      status: "NO_ACTIVE_SUBSCRIPTION",
      message: `No active meal subscription found for #${memberId4} (${customer.name}).`,
      customer: {
        id: customer.id,
        memberId4: customer.memberId4,
        name: customer.name,
        mobile: customer.mobile,
        notes: customer.notes,
      },
    };
  }

  const validRecords = activeSub.mealRecords;
  const usedMeals = validRecords.length;
  const remainingMeals = Math.max(0, activeSub.quota - usedMeals);
  const consumedTodayCount = validRecords.filter(
    (r) => r.businessDate === businessDate
  ).length;

  const subState = calculateSubscriptionStatus({
    status: activeSub.status,
    startDate: activeSub.startDate,
    endDate: activeSub.endDate,
    quota: activeSub.quota,
    usedMeals,
  });

  if (subState === "EXPIRED") {
    return {
      status: "EXPIRED_SUBSCRIPTION",
      message: `Subscription for #${memberId4} expired on ${
        activeSub.endDate ? new Date(activeSub.endDate).toLocaleDateString() : "past date"
      }.`,
      customer: {
        id: customer.id,
        memberId4: customer.memberId4,
        name: customer.name,
        mobile: customer.mobile,
        notes: customer.notes,
      },
      subscription: {
        id: activeSub.id,
        planName: activeSub.plan?.name || "Custom Subscription",
        quota: activeSub.quota,
        mealsPerDay: activeSub.mealsPerDay,
        startDate: activeSub.startDate.toISOString(),
        endDate: activeSub.endDate ? activeSub.endDate.toISOString() : null,
        usedMeals,
        remainingMeals,
        consumedTodayCount,
      },
    };
  }

  if (remainingMeals <= 0 || subState === "EXHAUSTED") {
    return {
      status: "EXHAUSTED_QUOTA",
      message: `No meals remaining for #${memberId4} (${usedMeals}/${activeSub.quota} consumed).`,
      customer: {
        id: customer.id,
        memberId4: customer.memberId4,
        name: customer.name,
        mobile: customer.mobile,
        notes: customer.notes,
      },
      subscription: {
        id: activeSub.id,
        planName: activeSub.plan?.name || "Custom Subscription",
        quota: activeSub.quota,
        mealsPerDay: activeSub.mealsPerDay,
        startDate: activeSub.startDate.toISOString(),
        endDate: activeSub.endDate ? activeSub.endDate.toISOString() : null,
        usedMeals,
        remainingMeals: 0,
        consumedTodayCount,
      },
    };
  }

  if (consumedTodayCount >= activeSub.mealsPerDay) {
    return {
      status: "DAILY_LIMIT_REACHED",
      message: `Daily meal limit reached (${consumedTodayCount}/${activeSub.mealsPerDay} meals recorded today for #${memberId4}).`,
      customer: {
        id: customer.id,
        memberId4: customer.memberId4,
        name: customer.name,
        mobile: customer.mobile,
        notes: customer.notes,
      },
      subscription: {
        id: activeSub.id,
        planName: activeSub.plan?.name || "Custom Subscription",
        quota: activeSub.quota,
        mealsPerDay: activeSub.mealsPerDay,
        startDate: activeSub.startDate.toISOString(),
        endDate: activeSub.endDate ? activeSub.endDate.toISOString() : null,
        usedMeals,
        remainingMeals,
        consumedTodayCount,
      },
    };
  }

  return {
    status: "VALID",
    customer: {
      id: customer.id,
      memberId4: customer.memberId4,
      name: customer.name,
      mobile: customer.mobile,
      notes: customer.notes,
    },
    subscription: {
      id: activeSub.id,
      planName: activeSub.plan?.name || "Custom Subscription",
      quota: activeSub.quota,
      mealsPerDay: activeSub.mealsPerDay,
      startDate: activeSub.startDate.toISOString(),
      endDate: activeSub.endDate ? activeSub.endDate.toISOString() : null,
      usedMeals,
      remainingMeals,
      consumedTodayCount,
    },
  };
}

/**
 * Transaction-safe meal recording service
 */
export async function recordMealForCustomer(
  providerId: string,
  userId: string,
  customerId: string,
  subscriptionId: string,
  mealType?: string,
  providerTimezone = "Asia/Kolkata",
  idempotencyKey?: string
) {
  const businessDate = getProviderBusinessDate(providerTimezone);

  // Execute inside a Prisma transaction for concurrency safety
  return await db.$transaction(async (tx) => {
    // 0. Idempotency Check: If key provided, check if already processed
    if (idempotencyKey) {
      const existing = await tx.mealRecord.findUnique({
        where: { idempotencyKey },
        include: { customer: selectCustomerFields },
      });

      if (existing) {
        // Return existing record idempotently
        const currentValid = await tx.mealRecord.count({
          where: { subscriptionId: existing.subscriptionId, status: "VALID" },
        });
        const sub = await tx.subscription.findUnique({
          where: { id: existing.subscriptionId },
          select: { quota: true },
        });

        const remaining = Math.max(0, (sub?.quota || 0) - currentValid);

        return {
          mealRecord: existing,
          remainingMeals: remaining,
          customerName: existing.customer.name,
          memberId4: existing.customer.memberId4,
          isIdempotentRetry: true,
        };
      }
    }

    // 1. Verify customer and tenant isolation
    const customer = await tx.customer.findFirst({
      where: { id: customerId, providerId },
    });

    if (!customer) {
      throw new Error("Customer not found or unauthorized.");
    }

    // 2. Verify subscription
    const subscription = await tx.subscription.findFirst({
      where: { id: subscriptionId, customerId },
      include: {
        mealRecords: {
          where: { status: "VALID" },
          select: { id: true, businessDate: true, mealType: true },
        },
      },
    });

    if (!subscription || subscription.status !== "ACTIVE") {
      throw new Error("Subscription is not active.");
    }

    const validRecords = subscription.mealRecords;
    const usedMeals = validRecords.length;
    const remainingMeals = subscription.quota - usedMeals;

    if (remainingMeals <= 0) {
      throw new Error("No meals remaining on this subscription.");
    }

    // Check expiration
    if (subscription.endDate) {
      const today = new Date(businessDate);
      const end = new Date(subscription.endDate);
      if (end < today) {
        throw new Error("Subscription has expired.");
      }
    }

    // Check mealsPerDay limit
    const consumedTodayRecords = validRecords.filter(
      (r) => r.businessDate === businessDate
    );

    if (consumedTodayRecords.length >= subscription.mealsPerDay) {
      throw new Error(
        `Daily meal limit reached (${consumedTodayRecords.length}/${subscription.mealsPerDay} meals used today).`
      );
    }

    // Check mealType duplicate for today (if mealType specified)
    if (mealType) {
      const alreadyHasMealTypeToday = consumedTodayRecords.some(
        (r) => r.mealType?.toUpperCase() === mealType.toUpperCase()
      );
      if (alreadyHasMealTypeToday) {
        throw new Error(
          `${mealType} meal has already been recorded for today.`
        );
      }
    }

    // 3. Insert MealRecord ledger entry
    const mealRecord = await tx.mealRecord.create({
      data: {
        customerId,
        subscriptionId,
        businessDate,
        consumedAt: new Date(),
        mealType: mealType || null,
        recordedById: userId,
        idempotencyKey: idempotencyKey || null,
        status: "VALID",
      },
    });

    // 4. Create Audit Log entry
    await tx.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "MEAL_RECORDED",
        entity: "MealRecord",
        entityId: mealRecord.id,
        metadata: {
          memberId4: customer.memberId4,
          customerName: customer.name,
          businessDate,
          remainingMealsAfter: remainingMeals - 1,
        },
      },
    });

    return {
      mealRecord,
      remainingMeals: remainingMeals - 1,
      customerName: customer.name,
      memberId4: customer.memberId4,
    };
  });
}

/**
 * Void/Correct a meal record
 */
export async function voidMealRecord(
  providerId: string,
  userId: string,
  mealRecordId: string,
  reason: string
) {
  return await db.$transaction(async (tx) => {
    // 1. Fetch MealRecord and check provider boundary
    const record = await tx.mealRecord.findFirst({
      where: {
        id: mealRecordId,
        customer: { providerId },
      },
      include: {
        customer: { select: { name: true, memberId4: true } },
        subscription: true,
      },
    });

    if (!record) {
      throw new Error("Meal record not found or unauthorized.");
    }

    if (record.status === "VOIDED") {
      throw new Error("Meal record is already voided.");
    }

    // 2. Soft-void record (BR-010)
    const voided = await tx.mealRecord.update({
      where: { id: mealRecordId },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidedById: userId,
        voidReason: reason,
      },
    });

    // 3. Create Audit Log
    await tx.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "MEAL_VOIDED",
        entity: "MealRecord",
        entityId: mealRecordId,
        reason,
        metadata: {
          memberId4: record.customer.memberId4,
          businessDate: record.businessDate,
        },
      },
    });

    // 4. Calculate updated remaining balance
    const validCount = await tx.mealRecord.count({
      where: {
        subscriptionId: record.subscriptionId,
        status: "VALID",
      },
    });

    const restoredRemaining = Math.max(0, record.subscription.quota - validCount);

    return {
      mealRecord: voided,
      restoredRemaining,
      customerName: record.customer.name,
      memberId4: record.customer.memberId4,
    };
  });
}
