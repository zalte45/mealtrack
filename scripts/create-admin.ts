/**
 * MealTrack — Create Initial Admin (Owner) Account
 *
 * Usage:
 *   npm run create-admin
 *
 * This script:
 * 1. Connects to the database (DATABASE_URL must be set in .env.local)
 * 2. Checks if a Provider already exists (idempotent)
 * 3. Prompts for business name, owner name, email, and password
 * 4. Hashes the password with bcryptjs (NEVER stored plaintext)
 * 5. Creates Provider + Owner User in a single transaction
 *
 * SECURITY:
 * - Password is hashed with bcryptjs (cost factor 12)
 * - Password is never logged, stored in env, or echoed to terminal
 * - Script is idempotent — re-running skips existing owners
 *
 * Run this ONCE when setting up MealTrack for the first time.
 * Additional staff users can be added through the Settings UI.
 */

import { createInterface } from "readline";
import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

// Load .env.local manually since this script runs outside Next.js
// tsx will handle .env if dotenv is used, but we want .env.local
const require = createRequire(import.meta.url);
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" }); // fallback
} catch {
  // dotenv not available — DATABASE_URL must be set in environment
}

const prisma = new PrismaClient({
  log: ["error"],
});

// ============================================================
// Prompt helper
// ============================================================

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden) {
      // Hide password input
      process.stdout.write(question);
      process.stdin.setRawMode?.(true);
      let input = "";

      process.stdin.on("data", function handler(char: Buffer) {
        const str = char.toString();
        if (str === "\n" || str === "\r" || str === "\u0004") {
          process.stdin.setRawMode?.(false);
          process.stdin.removeListener("data", handler);
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (str === "\u007f" || str === "\b") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += str;
        }
      });

      process.stdin.resume();
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

// ============================================================
// Validation helpers
// ============================================================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  return { valid: true };
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("\n===========================================================");
  console.log("  MealTrack — Create Initial Owner Account");
  console.log("===========================================================\n");

  // Check database connection
  try {
    await prisma.$connect();
    console.log("✓ Connected to database\n");
  } catch (err) {
    console.error("✗ Could not connect to the database.");
    console.error("  Make sure DATABASE_URL is set in .env.local and the database is running.");
    console.error("  For local development, run: docker compose up -d\n");
    console.error("  Error:", (err as Error).message);
    process.exit(1);
  }

  // Check if an owner already exists
  const existingOwner = await prisma.user.findFirst({
    where: { role: "OWNER", status: "ACTIVE" },
    include: { provider: true },
  });

  if (existingOwner) {
    console.log("ℹ  An Owner account already exists:");
    console.log(`   Name:     ${existingOwner.name}`);
    console.log(`   Email:    ${existingOwner.email}`);
    console.log(`   Business: ${existingOwner.provider.name}`);
    console.log("\n   To add more staff users, use the Settings page in the application.");
    console.log("   To reset the owner password, use the Settings page or run a separate reset script.\n");
    await prisma.$disconnect();
    process.exit(0);
  }

  // Collect information
  console.log("Please provide the following information to set up MealTrack:\n");

  const businessName = await prompt("Business name (e.g. Rahul's Tiffin Service): ");
  if (!businessName || businessName.length < 2) {
    console.error("\n✗ Business name is required (minimum 2 characters).");
    process.exit(1);
  }

  const ownerName = await prompt("Owner full name: ");
  if (!ownerName || ownerName.length < 2) {
    console.error("\n✗ Owner name is required (minimum 2 characters).");
    process.exit(1);
  }

  const email = await prompt("Owner email address: ");
  if (!isValidEmail(email)) {
    console.error("\n✗ Please provide a valid email address.");
    process.exit(1);
  }

  const password = await prompt("Create a password (min 8 characters): ", true);
  const passwordCheck = isStrongPassword(password);
  if (!passwordCheck.valid) {
    console.error(`\n✗ ${passwordCheck.message}`);
    process.exit(1);
  }

  const confirmPassword = await prompt("Confirm password: ", true);
  if (password !== confirmPassword) {
    console.error("\n✗ Passwords do not match. Please try again.");
    process.exit(1);
  }

  console.log("\n⏳ Creating your MealTrack account...\n");

  // Hash the password
  const BCRYPT_COST = 12;
  const passwordHash = await bcryptjs.hash(password, BCRYPT_COST);

  // Create Provider + Owner in a transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      const provider = await tx.provider.create({
        data: {
          name: businessName.trim(),
          timezone: "Asia/Kolkata", // Default; can be changed in Settings
          status: "ACTIVE",
        },
      });

      const owner = await tx.user.create({
        data: {
          providerId: provider.id,
          name: ownerName.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      return { provider, owner };
    });

    console.log("===========================================================");
    console.log("  ✓ MealTrack setup complete!");
    console.log("===========================================================");
    console.log(`\n  Business: ${result.provider.name}`);
    console.log(`  Owner:    ${result.owner.name}`);
    console.log(`  Email:    ${result.owner.email}`);
    console.log(`  Role:     ${result.owner.role}`);
    console.log("\n  You can now start the application with: npm run dev");
    console.log("  Then log in at: http://localhost:3000/login\n");
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("Unique constraint")) {
      console.error("\n✗ An account with that email already exists.");
    } else {
      console.error("\n✗ Failed to create account:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("\n✗ Unexpected error:", err);
  process.exit(1);
});
