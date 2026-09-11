/**
 * Zod validation schemas for MealTrack
 *
 * Compatible with Zod v4 (error param replaces required_error/invalid_type_error).
 * These schemas are the single source of truth for input validation.
 * Used in both API route handlers and server actions.
 * All business rule validation is done server-side.
 */

import { z } from "zod";

// ==============================================================================
// Auth schemas
// ==============================================================================

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ==============================================================================
// Customer schemas
// ==============================================================================

/**
 * memberId4: exactly 4 numeric digits (BR-001)
 * e.g. "1001", "4827", "9999"
 */
export const MemberId4Schema = z
  .string()
  .regex(/^\d{4}$/, "Member ID must be exactly 4 numeric digits")
  .refine((val) => parseInt(val) >= 1000 && parseInt(val) <= 9999, {
    message: "Member ID must be between 1000 and 9999",
  });

export const CreateCustomerSchema = z.object({
  memberId4: MemberId4Schema,
  name: z
    .string()
    .min(1, "Customer name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  mobile: z
    .string()
    .trim()
    .regex(/^[+\d\s\-()]{7,20}$/, "Please enter a valid mobile number")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

// ==============================================================================
// MealPlan schemas
// ==============================================================================

export const CreateMealPlanSchema = z.object({
  name: z
    .string()
    .min(1, "Plan name is required")
    .max(100)
    .trim(),
  quota: z
    .number()
    .int("Quota must be a whole number")
    .min(1, "Quota must be at least 1")
    .max(9999, "Quota seems too large"),
  mealsPerDay: z
    .number()
    .int()
    .min(1, "Must allow at least 1 meal per day")
    .max(10)
    .default(1),
  validityDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .optional(),
  price: z
    .number()
    .min(0, "Price cannot be negative"),
});

export type CreateMealPlanInput = z.infer<typeof CreateMealPlanSchema>;

// ==============================================================================
// Subscription schemas
// ==============================================================================

export const CreateSubscriptionSchema = z
  .object({
    customerId: z.string().min(1, "Customer ID is required"),
    planId: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD")
      .optional(),
    quota: z
      .number()
      .int()
      .min(1, "Quota must be at least 1"),
    mealsPerDay: z.number().int().min(1).max(10).default(1),
    price: z.number().min(0),
    paymentStatus: z
      .enum(["PENDING", "PAID", "PARTIAL"])
      .default("PENDING"),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.endDate && data.startDate > data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

// ==============================================================================
// Meal Counter schemas
// ==============================================================================

export const MealLookupSchema = z.object({
  memberId4: MemberId4Schema,
});

export type MealLookupInput = z.infer<typeof MealLookupSchema>;

export const RecordMealSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Business date must be YYYY-MM-DD"),
  mealType: z.string().optional(),
});

export type RecordMealInput = z.infer<typeof RecordMealSchema>;

export const VoidMealSchema = z.object({
  reason: z
    .string()
    .min(3, "Please provide a reason for voiding this meal")
    .max(500),
});

export type VoidMealInput = z.infer<typeof VoidMealSchema>;

// ==============================================================================
// Utility: Member ID suggestion validation
// ==============================================================================

export const SuggestMemberIdSchema = z.object({
  startFrom: z.number().int().min(1000).max(9999).optional(),
});
