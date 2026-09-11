/**
 * NextAuth.js type augmentation
 *
 * Extends the default Session/JWT types to include MealTrack-specific fields:
 * - role: OWNER | STAFF
 * - providerId: tenant isolation
 * - providerName, providerTimezone: display + business logic
 */

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      providerId: string;
      providerName: string;
      providerTimezone: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    providerId: string;
    providerName: string;
    providerTimezone: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
    providerId: string;
    providerName: string;
    providerTimezone: string;
  }
}

// ==============================================================================
// Application-level types
// ==============================================================================

export type UserRole = "OWNER" | "STAFF";

export type CustomerStatus = "ACTIVE" | "ARCHIVED";

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL";

export type MealRecordStatus = "VALID" | "VOIDED";

export type ProviderStatus = "ACTIVE" | "SUSPENDED";

export type MealPlanStatus = "ACTIVE" | "ARCHIVED";

// ==============================================================================
// API response types
// ==============================================================================

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ==============================================================================
// Meal Counter types (used by the hot-path lookup)
// ==============================================================================

export type MealLookupResult = {
  customer: {
    id: string;
    memberId4: string;
    name: string;
    mobile: string | null;
    status: string;
  };
  subscription: {
    id: string;
    quota: number;
    mealsPerDay: number;
    startDate: string;
    endDate: string | null;
    status: string;
    paymentStatus: string;
    planName: string | null;
    used: number;
    remaining: number;
  } | null;
  lookupStatus:
    | "READY"          // Valid customer + active subscription with remaining meals
    | "NO_SUBSCRIPTION" // No active subscription
    | "EXPIRED"         // Subscription expired
    | "ZERO_BALANCE"    // Subscription exhausted
    | "ARCHIVED";       // Customer is archived
};

export type MealRecordResult = {
  mealRecordId: string;
  customerId: string;
  subscriptionId: string;
  businessDate: string;
  remaining: number;
  consumedAt: string;
};

// ==============================================================================
// Audit action constants
// ==============================================================================

export const AUDIT_ACTIONS = {
  MEAL_RECORDED: "MEAL_RECORDED",
  MEAL_VOIDED: "MEAL_VOIDED",
  SUBSCRIPTION_CREATED: "SUBSCRIPTION_CREATED",
  SUBSCRIPTION_CANCELLED: "SUBSCRIPTION_CANCELLED",
  SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED",
  CUSTOMER_CREATED: "CUSTOMER_CREATED",
  CUSTOMER_UPDATED: "CUSTOMER_UPDATED",
  CUSTOMER_ARCHIVED: "CUSTOMER_ARCHIVED",
  USER_CREATED: "USER_CREATED",
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  USER_SUSPENDED: "USER_SUSPENDED",
  SETTINGS_CHANGED: "SETTINGS_CHANGED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
