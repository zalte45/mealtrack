/**
 * Phase 4 Unit & Service Verification Test Script
 *
 * Tests:
 * 1. Meal Plan Schema Validation (CreateMealPlanSchema)
 * 2. Subscription Schema Validation (CreateSubscriptionSchema)
 * 3. Subscription Status Calculation Engine (calculateSubscriptionStatus)
 * 4. Configurable End Date Calculations (calculateEndDate)
 * 5. Multi-Subscription History & Snapshot rules
 */

import { CreateMealPlanSchema, CreateSubscriptionSchema } from "../lib/validations";
import { calculateSubscriptionStatus, calculateEndDate, calculateRemainingMeals } from "../lib/subscription-helpers";

function runPhase4Tests() {
  console.log("==========================================================");
  console.log("MealTrack Phase 4 — Subscription & Meal Plan Service Tests");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Meal Plan Validation Tests
  console.log("\n--- 1. Meal Plan Schema Validation ---");
  const validPlan = CreateMealPlanSchema.safeParse({
    name: "Monthly 30 Meals",
    quota: 30,
    mealsPerDay: 1,
    validityDays: 30,
    price: 3000,
  });
  assert(validPlan.success, "Standard 30 meal / 30 day plan passes schema");

  const customConfigPlan = CreateMealPlanSchema.safeParse({
    name: "26 Meal Flexible Plan",
    quota: 26,
    mealsPerDay: 2,
    validityDays: 45, // Quota and validity days are completely independent!
    price: 2800,
  });
  assert(customConfigPlan.success, "Non-hardcoded 26 meal / 45 day plan passes schema");

  const openPlan = CreateMealPlanSchema.safeParse({
    name: "No-Expiry 50 Meal Pack",
    quota: 50,
    validityDays: null,
    price: 5000,
  });
  assert(openPlan.success, "No-expiry null validity plan passes schema");

  const zeroQuotaPlan = CreateMealPlanSchema.safeParse({
    name: "Invalid Zero Quota",
    quota: 0,
    price: 100,
  });
  assert(!zeroQuotaPlan.success, "Zero quota plan fails schema validation");

  // 2. Subscription Schema Validation Tests
  console.log("\n--- 2. Subscription Schema Validation ---");
  const validSub = CreateSubscriptionSchema.safeParse({
    customerId: "cust_123",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    quota: 30,
    mealsPerDay: 1,
    price: 3000,
    paymentStatus: "PAID",
  });
  assert(validSub.success, "Valid subscription payload passes schema");

  const invalidDateSub = CreateSubscriptionSchema.safeParse({
    customerId: "cust_123",
    startDate: "2026-09-30",
    endDate: "2026-09-01", // End date before start date!
    quota: 30,
    price: 3000,
  });
  assert(!invalidDateSub.success, "End date before start date fails schema validation");

  // 3. Subscription Status Engine Tests
  console.log("\n--- 3. Subscription Status Engine ---");
  const refDate = new Date("2026-09-15T12:00:00Z");

  const activeState = calculateSubscriptionStatus(
    {
      status: "ACTIVE",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      quota: 30,
      usedMeals: 10,
    },
    refDate
  );
  assert(activeState === "ACTIVE", "Ongoing valid subscription evaluates to 'ACTIVE'");

  const exhaustedState = calculateSubscriptionStatus(
    {
      status: "ACTIVE",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      quota: 30,
      usedMeals: 30, // 30 of 30 consumed
    },
    refDate
  );
  assert(exhaustedState === "EXHAUSTED", "Fully consumed quota evaluates to 'EXHAUSTED'");

  const expiredState = calculateSubscriptionStatus(
    {
      status: "ACTIVE",
      startDate: "2026-08-01",
      endDate: "2026-08-31", // Past date
      quota: 30,
      usedMeals: 15,
    },
    refDate
  );
  assert(expiredState === "EXPIRED", "Past end date evaluates to 'EXPIRED'");

  const cancelledState = calculateSubscriptionStatus(
    {
      status: "CANCELLED",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      quota: 30,
      usedMeals: 5,
    },
    refDate
  );
  assert(cancelledState === "CANCELLED", "Manually cancelled plan evaluates to 'CANCELLED'");

  const futureState = calculateSubscriptionStatus(
    {
      status: "ACTIVE",
      startDate: "2026-10-01", // Future start
      endDate: "2026-10-31",
      quota: 30,
      usedMeals: 0,
    },
    refDate
  );
  assert(futureState === "PENDING_START", "Future start date evaluates to 'PENDING_START'");

  // 4. End Date & Remaining Meals Helpers
  console.log("\n--- 4. End Date & Quota Calculations ---");
  const computedEnd = calculateEndDate("2026-09-01", 30);
  assert(computedEnd === "2026-09-30", "Start 2026-09-01 + 30 days validity yields 2026-09-30");

  const openEnd = calculateEndDate("2026-09-01", null);
  assert(openEnd === null, "Null validity yields null end date (open-ended)");

  assert(calculateRemainingMeals(30, 12) === 18, "Remaining meals calculation: 30 - 12 = 18");
  assert(calculateRemainingMeals(30, 35) === 0, "Remaining meals calculation never drops below 0");

  console.log("\n==========================================================");
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests();
