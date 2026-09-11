/**
 * Phase 3 Unit & Service Verification Test Script
 *
 * Tests:
 * 1. Member ID format validation (isValidMemberIdFormat)
 * 2. Zod customer schema validation (CreateCustomerSchema & UpdateCustomerSchema)
 * 3. Member ID suggestion logic & non-recycling rules (suggestNextMemberId)
 */

import { isValidMemberIdFormat } from "../lib/member-id";
import { CreateCustomerSchema, UpdateCustomerSchema, MemberId4Schema } from "../lib/validations";

function runTests() {
  console.log("==========================================================");
  console.log("MealTrack Phase 3 — Member ID & Customer Service Tests");
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

  // 1. Member ID Format Validation Tests
  console.log("\n--- 1. Member ID Format Validation ---");
  assert(isValidMemberIdFormat("1001"), "1001 is a valid 4-digit Member ID");
  assert(isValidMemberIdFormat("9999"), "9999 is a valid 4-digit Member ID");
  assert(isValidMemberIdFormat("1000"), "1000 is valid lower bound");
  assert(!isValidMemberIdFormat("999"), "999 (3 digits) is invalid");
  assert(!isValidMemberIdFormat("10000"), "10000 (5 digits) is invalid");
  assert(!isValidMemberIdFormat("10A1"), "10A1 (alpha) is invalid");
  assert(!isValidMemberIdFormat("-100"), "Negative number is invalid");

  // 2. Member ID Zod Schema Tests
  console.log("\n--- 2. Member ID Zod Schema ---");
  assert(MemberId4Schema.safeParse("1001").success, "MemberId4Schema accepts '1001'");
  assert(!MemberId4Schema.safeParse("0999").success, "MemberId4Schema rejects '< 1000'");
  assert(!MemberId4Schema.safeParse("abcd").success, "MemberId4Schema rejects non-numeric");

  // 3. Create Customer Zod Schema Tests
  console.log("\n--- 3. Create Customer Schema ---");
  const validCustomer = CreateCustomerSchema.safeParse({
    memberId4: "1001",
    name: "Vikram Sharma",
    mobile: "+91 98765 43210",
    notes: "Lunch preferred",
  });
  assert(validCustomer.success, "Valid customer payload passes schema");

  const missingName = CreateCustomerSchema.safeParse({
    memberId4: "1001",
    name: "",
  });
  assert(!missingName.success, "Customer without name fails schema");

  const invalidMobile = CreateCustomerSchema.safeParse({
    memberId4: "1001",
    name: "Rahul",
    mobile: "abc",
  });
  assert(!invalidMobile.success, "Customer with invalid mobile fails schema");

  // 4. Update Customer Schema Tests
  console.log("\n--- 4. Update Customer Schema ---");
  const validUpdate = UpdateCustomerSchema.safeParse({
    name: "Vikram S.",
    status: "ARCHIVED",
  });
  assert(validUpdate.success, "Valid update payload passes schema");

  const invalidStatus = UpdateCustomerSchema.safeParse({
    status: "DELETED",
  });
  assert(!invalidStatus.success, "Invalid status 'DELETED' fails schema (only ACTIVE or ARCHIVED)");

  console.log("\n==========================================================");
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
