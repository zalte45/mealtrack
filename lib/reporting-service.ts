/**
 * MealTrack Reporting & Ledger Query Service
 *
 * Source of truth: SRS §3.4, §3.5 + Architecture §6 Database Integrity
 *
 * All metrics derive strictly from the MealRecord and AuditLog database tables.
 * - VALID records count towards meal consumption totals.
 * - VOIDED records are tracked for operational summaries but EXCLUDED from consumption totals.
 */

import { db } from "@/lib/db";
import { getProviderBusinessDate } from "@/lib/counter-service";
import { Prisma } from "@prisma/client";

export interface DailyRegisterOptions {
  providerId: string;
  businessDate?: string;
  status?: string; // ALL | VALID | VOIDED
  mealType?: string;
  page?: number;
  limit?: number;
  providerTimezone?: string;
}

export async function getDailyRegister(options: DailyRegisterOptions) {
  const {
    providerId,
    businessDate = getProviderBusinessDate(options.providerTimezone || "Asia/Kolkata"),
    status = "ALL",
    mealType,
    page = 1,
    limit = 20,
  } = options;

  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

  const where: Prisma.MealRecordWhereInput = {
    customer: { providerId },
    businessDate,
  };

  if (status === "VALID" || status === "VOIDED") {
    where.status = status;
  }

  if (mealType) {
    where.mealType = { equals: mealType, mode: "insensitive" };
  }

  const [records, total] = await Promise.all([
    db.mealRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { consumedAt: "desc" },
      include: {
        customer: {
          select: { id: true, memberId4: true, name: true, mobile: true },
        },
        subscription: {
          select: {
            id: true,
            quota: true,
            plan: { select: { name: true } },
          },
        },
        recordedBy: { select: { name: true } },
        voidedBy: { select: { name: true } },
      },
    }),
    db.mealRecord.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    businessDate,
    records,
    total,
    page,
    totalPages,
  };
}

export async function getDailySummary(
  providerId: string,
  businessDate = getProviderBusinessDate()
) {
  const [validCount, voidedCount, typeGroupings] = await Promise.all([
    db.mealRecord.count({
      where: {
        customer: { providerId },
        businessDate,
        status: "VALID",
      },
    }),
    db.mealRecord.count({
      where: {
        customer: { providerId },
        businessDate,
        status: "VOIDED",
      },
    }),
    db.mealRecord.groupBy({
      by: ["mealType"],
      where: {
        customer: { providerId },
        businessDate,
        status: "VALID",
      },
      _count: { _all: true },
    }),
  ]);

  const mealTypeBreakdown: Record<string, number> = {};
  for (const group of typeGroupings) {
    const typeKey = group.mealType || "Standard";
    mealTypeBreakdown[typeKey] = group._count._all;
  }

  return {
    businessDate,
    totalValidMeals: validCount,
    totalVoidedMeals: voidedCount,
    totalTransactions: validCount + voidedCount,
    mealTypeBreakdown,
  };
}

export async function getCustomerMealHistory(
  providerId: string,
  customerId: string,
  page = 1,
  limit = 20
) {
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

  const customer = await db.customer.findFirst({
    where: { id: customerId, providerId },
    select: { id: true, memberId4: true, name: true, mobile: true },
  });

  if (!customer) {
    throw new Error("Customer not found or unauthorized.");
  }

  const [records, total] = await Promise.all([
    db.mealRecord.findMany({
      where: { customerId },
      skip,
      take: limit,
      orderBy: { consumedAt: "desc" },
      include: {
        subscription: {
          select: {
            id: true,
            quota: true,
            plan: { select: { name: true } },
          },
        },
        recordedBy: { select: { name: true } },
        voidedBy: { select: { name: true } },
      },
    }),
    db.mealRecord.count({ where: { customerId } }),
  ]);

  return {
    customer,
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAuditLogs(
  providerId: string,
  page = 1,
  limit = 20,
  actionFilter?: string
) {
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

  const where: Prisma.AuditLogWhereInput = {
    providerId,
    ...(actionFilter ? { action: actionFilter } : {}),
  };

  const [auditLogs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
      include: {
        actor: { select: { name: true, email: true, role: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    auditLogs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
