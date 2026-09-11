/**
 * MealTrack — Development Seed Script
 *
 * Usage: npm run db:seed
 *
 * Creates:
 * 1. A sample Provider (if none exists)
 * 2. An Owner user (password: "password123" — for dev only)
 * 3. A Staff user
 * 4. Three sample MealPlans
 * 5. Five sample Customers (IDs 1001–1005)
 * 6. Active subscriptions for each customer
 *
 * WARNING: This is for DEVELOPMENT only.
 * Do NOT run in production. Use npm run create-admin instead.
 */

import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main() {
  console.log("🌱 Seeding development database...\n");

  // Idempotency check
  const existing = await prisma.provider.findFirst();
  if (existing) {
    console.log("ℹ  Database already has data. Skipping seed to prevent duplicates.");
    console.log("   To re-seed, clear the database first: npx prisma migrate reset\n");
    return;
  }

  const BCRYPT_COST = 10; // Lower cost for development speed

  // Create Provider
  const provider = await prisma.provider.create({
    data: {
      name: "Dev Tiffin Service",
      timezone: "Asia/Kolkata",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Provider: ${provider.name} (${provider.id})`);

  // Create Owner
  const owner = await prisma.user.create({
    data: {
      providerId: provider.id,
      name: "Dev Owner",
      email: "owner@mealtrack.dev",
      passwordHash: await bcryptjs.hash("password123", BCRYPT_COST),
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Owner: ${owner.email} (password: password123)`);

  // Create Staff
  const staff = await prisma.user.create({
    data: {
      providerId: provider.id,
      name: "Dev Staff",
      email: "staff@mealtrack.dev",
      passwordHash: await bcryptjs.hash("password123", BCRYPT_COST),
      role: "STAFF",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Staff: ${staff.email} (password: password123)`);

  // Create MealPlans
  const plan30 = await prisma.mealPlan.create({
    data: {
      providerId: provider.id,
      name: "Monthly 30 Meals",
      quota: 30,
      mealsPerDay: 1,
      validityDays: 31,
      price: 2400.00,
      status: "ACTIVE",
    },
  });

  const plan26 = await prisma.mealPlan.create({
    data: {
      providerId: provider.id,
      name: "26 Meal Plan",
      quota: 26,
      mealsPerDay: 1,
      validityDays: 31,
      price: 2100.00,
      status: "ACTIVE",
    },
  });

  const plan60 = await prisma.mealPlan.create({
    data: {
      providerId: provider.id,
      name: "Two-Month 60 Meals",
      quota: 60,
      mealsPerDay: 1,
      validityDays: 62,
      price: 4500.00,
      status: "ACTIVE",
    },
  });
  console.log(`✓ Plans: ${plan30.name}, ${plan26.name}, ${plan60.name}`);

  // Create Customers (IDs 1001–1005)
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // "YYYY-MM-DD"

  // End date: ~30 days from today
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 29);
  const endDateStr = endDate.toISOString().split("T")[0];

  const customerData = [
    { memberId4: "1001", name: "Rahul Patil", mobile: "9876543210" },
    { memberId4: "1002", name: "Priya Sharma", mobile: "9876543211" },
    { memberId4: "1003", name: "Amit Kumar", mobile: "9876543212" },
    { memberId4: "1004", name: "Sunita Devi", mobile: "9876543213" },
    { memberId4: "1005", name: "Vikram Singh", mobile: "9876543214" },
  ];

  const plans = [plan30, plan26, plan30, plan26, plan60];

  for (let i = 0; i < customerData.length; i++) {
    const cData = customerData[i];
    const plan = plans[i];

    const customer = await prisma.customer.create({
      data: {
        providerId: provider.id,
        memberId4: cData.memberId4,
        name: cData.name,
        mobile: cData.mobile,
        status: "ACTIVE",
      },
    });

    // Calculate subscription end based on plan
    const subEnd = new Date(today);
    subEnd.setDate(subEnd.getDate() + (plan.validityDays ?? 30) - 1);
    const subEndStr = subEnd.toISOString().split("T")[0];

    await prisma.subscription.create({
      data: {
        customerId: customer.id,
        planId: plan.id,
        startDate: new Date(todayStr),
        endDate: new Date(subEndStr),
        quota: plan.quota,
        mealsPerDay: plan.mealsPerDay,
        price: plan.price,
        paymentStatus: "PAID",
        status: "ACTIVE",
        notes: "Created by dev seed",
      },
    });

    console.log(`✓ Customer: ${customer.name} (ID: ${cData.memberId4}) — ${plan.name}`);
  }

  console.log("\n✅ Development seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Owner: owner@mealtrack.dev / password123");
  console.log("  Staff: staff@mealtrack.dev / password123\n");
  console.log("Test Member IDs: 1001, 1002, 1003, 1004, 1005\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("✗ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
