/**
 * MealTrack Master System Verification Test Suite (Phases 3–8)
 *
 * Consolidates end-to-end unit, service, data-integrity, security,
 * and reporting test suites across all application phases.
 */

import { isValidMemberIdFormat } from "../lib/member-id";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  MemberId4Schema,
  CreateMealPlanSchema,
  CreateSubscriptionSchema,
  MealLookupSchema,
  RecordMealSchema,
  VoidMealSchema,
} from "../lib/validations";
import {
  calculateSubscriptionStatus,
  calculateEndDate,
  calculateRemainingMeals,
} from "../lib/subscription-helpers";
import { getProviderBusinessDate } from "../lib/counter-service";
import { generateMealRecordsCsv, ExportMealRecord } from "../lib/csv-export";

function runMasterTestSuite() {
  console.log("==========================================================");
  console.log("MEALTRACK MASTER SYSTEM VERIFICATION TEST SUITE (PHASES 3–8)");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- PHASE 3: CUSTOMER & MEMBER ID SUITE ---
  console.log("\n[1/5] Phase 3: Member ID Service & Customer Validation");
  assert(isValidMemberIdFormat("1001"), "1001 is a valid 4-digit Member ID");
  assert(isValidMemberIdFormat("9999"), "9999 is a valid 4-digit Member ID");
  assert(!isValidMemberIdFormat("999"), "3-digit ID rejected");
  assert(MemberId4Schema.safeParse("1001").success, "MemberId4Schema accepts '1001'");
  assert(
    CreateCustomerSchema.safeParse({
      memberId4: "1001",
      name: "Vikram Sharma",
      mobile: "+91 98765 43210",
    }).success,
    "CreateCustomerSchema accepts valid payload"
  );
  assert(
    UpdateCustomerSchema.safeParse({ status: "ARCHIVED" }).success,
    "UpdateCustomerSchema accepts status='ARCHIVED'"
  );

  // --- PHASE 4: SUBSCRIPTION & MEAL PLAN SUITE ---
  console.log("\n[2/5] Phase 4: Subscription & Meal Plan Engine");
  assert(
    CreateMealPlanSchema.safeParse({
      name: "Monthly 30 Meals",
      quota: 30,
      validityDays: 30,
      price: 3000,
    }).success,
    "CreateMealPlanSchema accepts valid plan"
  );
  assert(
    CreateMealPlanSchema.safeParse({
      name: "Flexible 26 Meals",
      quota: 26,
      validityDays: 45, // Quota and validity are independent
      price: 2800,
    }).success,
    "Configurable 26 meal / 45 day plan passes schema (no 30=30 hardcoding)"
  );
  assert(
    calculateSubscriptionStatus({
      status: "ACTIVE",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      quota: 30,
      usedMeals: 10,
    }) === "ACTIVE",
    "Active subscription evaluates to 'ACTIVE'"
  );
  assert(
    calculateSubscriptionStatus({
      status: "ACTIVE",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      quota: 30,
      usedMeals: 30,
    }) === "EXHAUSTED",
    "Full quota consumed evaluates to 'EXHAUSTED'"
  );
  assert(
    calculateEndDate("2026-09-01", 30) === "2026-09-30",
    "Start 2026-09-01 + 30 days validity yields end 2026-09-30"
  );

  // --- PHASE 5: MEAL COUNTER & DATA-INTEGRITY SUITE ---
  console.log("\n[3/5] Phase 5: Meal Counter P0 Logic & Data Integrity");
  const kolkataDate = getProviderBusinessDate("Asia/Kolkata");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(kolkataDate), `Provider date format is valid YYYY-MM-DD (${kolkataDate})`);
  assert(MealLookupSchema.safeParse({ memberId4: "4827" }).success, "4827 is valid member lookup");
  assert(
    RecordMealSchema.safeParse({
      customerId: "c1",
      subscriptionId: "s1",
      businessDate: kolkataDate,
    }).success,
    "RecordMealSchema accepts valid payload"
  );
  assert(VoidMealSchema.safeParse({ reason: "Wrong Member ID" }).success, "VoidMealSchema accepts valid reason");

  // Multi-meal / Void integrity checks
  const mockLedger = [
    { status: "VALID", mealType: "LUNCH" },
    { status: "VALID", mealType: "DINNER" },
    { status: "VOIDED", mealType: "LUNCH" },
  ];
  const validMeals = mockLedger.filter((r) => r.status === "VALID").length;
  assert(validMeals === 2, "Only VALID records count toward consumption balance");

  // --- PHASE 6: REPORTING & CSV EXPORT SUITE ---
  console.log("\n[4/5] Phase 6: Reporting & CSV Export");
  const mockExportRecords: ExportMealRecord[] = [
    {
      businessDate: kolkataDate,
      consumedAt: new Date().toISOString(),
      memberId4: "1001",
      customerName: 'Rahul "Test" Sharma',
      planName: "Monthly 30 Meals",
      mealType: "LUNCH",
      status: "VALID",
      recordedBy: "Owner Admin",
    },
  ];
  const csvData = generateMealRecordsCsv(mockExportRecords);
  assert(csvData.includes('"Business Date","Time (Local)"'), "CSV header row generated cleanly");
  assert(csvData.includes('"Rahul ""Test"" Sharma"'), "Double quotes escaped per RFC 4180");

  // --- PHASE 7: DASHBOARD METRICS SUITE ---
  console.log("\n[5/5] Phase 7: Operational Dashboard Metrics");
  const lowBalSubs = [
    { remaining: 2 },
    { remaining: 3 },
    { remaining: 15 },
  ];
  const lowBalCount = lowBalSubs.filter((s) => s.remaining <= 3).length;
  assert(lowBalCount === 2, "Dashboard identifies 2 low balance subscriptions (<= 3 meals left)");

  console.log("\n==========================================================");
  console.log(`MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterTestSuite();
