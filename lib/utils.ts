/**
 * Shared utility functions for MealTrack
 */

import type { ClassValue } from "clsx";

/**
 * Merge Tailwind CSS class names safely.
 * Using clsx for conditional classes.
 */
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Get the current business date string in a given timezone.
 *
 * Business date is the "local date" in the provider's timezone,
 * NOT the UTC date. This prevents timezone-rollover bugs where
 * a meal recorded at 11pm IST would count as "tomorrow" in UTC.
 *
 * Returns: "YYYY-MM-DD"
 */
export function getBusinessDate(timezone: string = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Format a date string for display in the UI.
 * Input: "YYYY-MM-DD"
 * Output: "11 Sep 2026"
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a DateTime for display with time.
 * Output: "11 Sep 2026, 2:30 PM"
 */
export function formatDateTime(
  date: Date | string,
  timezone: string = "Asia/Kolkata"
): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Generate a safe, user-friendly error message.
 * Never expose stack traces or raw Prisma errors to the client.
 */
export function toUserFriendlyError(error: unknown): string {
  if (process.env.NODE_ENV === "development") {
    // In dev, show a bit more detail in the console (not sent to client)
    console.error("[MealTrack Error]", error);
  }

  if (error instanceof Error) {
    // Map known error patterns to friendly messages
    if (error.message.includes("Unique constraint")) {
      return "A record with that information already exists.";
    }
    if (error.message.includes("Foreign key constraint")) {
      return "Cannot complete this action because related records exist.";
    }
    if (error.message.includes("Record to update not found")) {
      return "The requested record was not found.";
    }
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Pad a Member ID integer to exactly 4 digits.
 * e.g. 1001 → "1001", 42 → "0042"
 */
export function formatMemberId(id: number): string {
  return id.toString().padStart(4, "0");
}

/**
 * Parse a Member ID string to integer safely.
 * Returns null if invalid.
 */
export function parseMemberId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const num = parseInt(trimmed, 10);
  if (num < 1000 || num > 9999) return null;
  return num;
}

/**
 * Check if a subscription is currently active based on status and dates.
 * Used for display purposes; server always re-validates.
 */
export function isSubscriptionActive(subscription: {
  status: string;
  startDate: Date | string;
  endDate: Date | string | null;
  quota: number;
}): boolean {
  if (subscription.status !== "ACTIVE") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(subscription.startDate);
  start.setHours(0, 0, 0, 0);
  if (today < start) return false;

  if (subscription.endDate) {
    const end = new Date(subscription.endDate);
    end.setHours(23, 59, 59, 999);
    if (today > end) return false;
  }

  return true;
}
