/**
 * GET /api/reports/export-csv
 *
 * Downloads tenant-isolated MealRecord ledger data as an RFC 4180 formatted CSV file.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { generateMealRecordsCsv, ExportMealRecord } from "@/lib/csv-export";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  const where: Prisma.MealRecordWhereInput = {
    customer: { providerId },
  };

  if (startDate && endDate) {
    where.businessDate = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    where.businessDate = { gte: startDate };
  } else if (endDate) {
    where.businessDate = { lte: endDate };
  }

  if (status === "VALID" || status === "VOIDED") {
    where.status = status;
  }

  if (q) {
    where.customer = {
      providerId,
      OR: [
        { memberId4: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  try {
    const mealRecords = await db.mealRecord.findMany({
      where,
      orderBy: { consumedAt: "desc" },
      take: 2500, // Reasonable max export limit per download
      include: {
        customer: {
          select: { memberId4: true, name: true },
        },
        subscription: {
          select: { plan: { select: { name: true } } },
        },
        recordedBy: { select: { name: true } },
      },
    });

    const exportRows: ExportMealRecord[] = mealRecords.map((r) => ({
      businessDate: r.businessDate,
      consumedAt: r.consumedAt,
      memberId4: r.customer.memberId4,
      customerName: r.customer.name,
      planName: r.subscription.plan?.name || "Custom Subscription",
      mealType: r.mealType,
      status: r.status,
      recordedBy: r.recordedBy.name,
      voidReason: r.voidReason,
    }));

    const csvData = generateMealRecordsCsv(exportRows);

    const fileName = `mealtrack-ledger-${startDate || "all"}-to-${endDate || "today"}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/export-csv] Error:", error);
    return NextResponse.json(
      { error: "Failed to export CSV." },
      { status: 500 }
    );
  }
}
