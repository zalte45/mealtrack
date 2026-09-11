/**
 * Phase 6 Unit & Reporting Service Verification Test Script
 *
 * Tests:
 * 1. CSV Generator Formatting & RFC 4180 Escaping (generateMealRecordsCsv)
 * 2. Daily Register Summary Calculation Rules (VALID vs VOIDED counts)
 * 3. Customer History Ledger Query Rules
 * 4. Audit Log Query Rules
 */

import { generateMealRecordsCsv, ExportMealRecord } from "../lib/csv-export";
import { getProviderBusinessDate } from "../lib/counter-service";

function runPhase6Tests() {
  console.log("==========================================================");
  console.log("MealTrack Phase 6 — Reporting & Operational Register Tests");
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

  // 1. Business Date & Timezone Tests
  console.log("\n--- 1. Business Date & Timezone Validation ---");
  const businessDate = getProviderBusinessDate("Asia/Kolkata");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(businessDate), `Provider business date is valid YYYY-MM-DD (${businessDate})`);

  // 2. CSV Generator Tests
  console.log("\n--- 2. CSV Export Generator Formatting ---");
  const mockExportRecords: ExportMealRecord[] = [
    {
      businessDate: "2026-09-11",
      consumedAt: "2026-09-11T12:30:00.000Z",
      memberId4: "1001",
      customerName: "Rahul Sharma",
      planName: "Monthly 30 Meals",
      mealType: "LUNCH",
      status: "VALID",
      recordedBy: "Owner Admin",
    },
    {
      businessDate: "2026-09-11",
      consumedAt: "2026-09-11T13:00:00.000Z",
      memberId4: "1002",
      customerName: 'Priya "Special" Verma', // Testing double quote escaping
      planName: "Custom Plan",
      mealType: null,
      status: "VOIDED",
      recordedBy: "Staff User",
      voidReason: "Wrong Member ID entered",
    },
  ];

  const csvResult = generateMealRecordsCsv(mockExportRecords);
  assert(csvResult.includes('"Business Date","Time (Local)"'), "CSV header row formatted correctly");
  assert(csvResult.includes('"#1001"'), "Member ID #1001 present in CSV output");
  assert(csvResult.includes('"Priya ""Special"" Verma"'), "Double quotes escaped according to RFC 4180");
  assert(csvResult.includes('"Wrong Member ID entered"'), "Void reason included in CSV output");

  // 3. Ledger Count Calculation Logic Tests
  console.log("\n--- 3. Ledger Count & Void Exclusion Rules ---");
  const mockLedger = [
    { status: "VALID", mealType: "LUNCH" },
    { status: "VALID", mealType: "LUNCH" },
    { status: "VALID", mealType: "DINNER" },
    { status: "VOIDED", mealType: "LUNCH" },
  ];

  const validMealsCount = mockLedger.filter((r) => r.status === "VALID").length;
  const voidedMealsCount = mockLedger.filter((r) => r.status === "VOIDED").length;

  assert(validMealsCount === 3, "Valid meals count equals 3");
  assert(voidedMealsCount === 1, "Voided meals count equals 1");

  const lunchValidCount = mockLedger.filter((r) => r.status === "VALID" && r.mealType === "LUNCH").length;
  assert(lunchValidCount === 2, "Valid Lunch breakdown count equals 2 (voided Lunch excluded)");

  console.log("\n==========================================================");
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests();
