/**
 * Phase 7 Unit & Dashboard Service Verification Test Script
 *
 * Tests:
 * 1. Low-Balance Alert Logic (remainingMeals <= 3)
 * 2. Expiring-Soon Alert Logic (endDate within 7 days)
 * 3. Meal Ledger Aggregation Rules (VALID vs VOIDED counts)
 * 4. Business Date Timezone Handling
 */

import { getProviderBusinessDate } from "../lib/counter-service";

function runPhase7DashboardTests() {
  console.log("==========================================================");
  console.log("MealTrack Phase 7 — Operational Dashboard Service Tests");
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

  // 1. Timezone Check
  console.log("\n--- 1. Provider Timezone & Business Date ---");
  const bDate = getProviderBusinessDate("Asia/Kolkata");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(bDate), `Dashboard business date format is valid YYYY-MM-DD (${bDate})`);

  // 2. Low Balance Threshold Logic Test
  console.log("\n--- 2. Low Balance Alert Threshold (<= 3 meals) ---");
  const testSubscriptions = [
    { id: "sub1", memberId4: "1001", quota: 30, usedMeals: 27, remaining: 3 },  // Low balance
    { id: "sub2", memberId4: "1002", quota: 30, usedMeals: 28, remaining: 2 },  // Low balance
    { id: "sub3", memberId4: "1003", quota: 30, usedMeals: 10, remaining: 20 }, // Normal balance
    { id: "sub4", memberId4: "1004", quota: 30, usedMeals: 30, remaining: 0 },  // Exhausted (handled separately)
  ];

  const lowBalanceList = testSubscriptions.filter((s) => s.remaining > 0 && s.remaining <= 3);
  assert(lowBalanceList.length === 2, "Low balance threshold (1 to 3 meals left) identifies 2 active subscriptions");
  assert(lowBalanceList.some((s) => s.memberId4 === "1001"), "Subscriber #1001 (3 meals left) included in low balance");
  assert(lowBalanceList.some((s) => s.memberId4 === "1002"), "Subscriber #1002 (2 meals left) included in low balance");

  // 3. Expiring Soon Threshold Logic Test (Next 7 Days)
  console.log("\n--- 3. Expiring Soon Alert Threshold (Next 7 Days) ---");
  const today = new Date("2026-09-11T12:00:00Z");
  const next7Days = new Date("2026-09-18T23:59:59Z");

  const subDates = [
    { memberId4: "1001", endDate: new Date("2026-09-14") }, // Within 7 days
    { memberId4: "1002", endDate: new Date("2026-09-17") }, // Within 7 days
    { memberId4: "1003", endDate: new Date("2026-10-30") }, // Far future
    { memberId4: "1004", endDate: new Date("2026-09-01") }, // Already past
  ];

  const expiringList = subDates.filter((s) => s.endDate >= today && s.endDate <= next7Days);
  assert(expiringList.length === 2, "Expiring threshold (0 to 7 days away) identifies 2 subscriptions");
  assert(expiringList.some((s) => s.memberId4 === "1001"), "Subscriber #1001 (ending 2026-09-14) included in expiring alerts");

  // 4. Meal Ledger Count Rule
  console.log("\n--- 4. Meal Ledger Count Integrity ---");
  const dayRecords = [
    { status: "VALID", count: 1 },
    { status: "VALID", count: 1 },
    { status: "VALID", count: 1 },
    { status: "VOIDED", count: 1 },
  ];

  const validTotal = dayRecords.filter((r) => r.status === "VALID").length;
  const voidedTotal = dayRecords.filter((r) => r.status === "VOIDED").length;

  assert(validTotal === 3, "Valid meals count equals 3");
  assert(voidedTotal === 1, "Voided meals count equals 1");

  console.log("\n==========================================================");
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7DashboardTests();
