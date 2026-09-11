/**
 * /api/customers
 *
 * GET  - List customers with search, status filtering, and pagination.
 * POST - Create a new customer with Member ID validation & tenant isolation.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CreateCustomerSchema } from "@/lib/validations";
import { isMemberIdAvailable, isValidMemberIdFormat } from "@/lib/member-id";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId } = auth.session.user;
  const searchParams = req.nextUrl.searchParams;

  const q = searchParams.get("q")?.trim() || "";
  const statusFilter = searchParams.get("status") || "ALL"; // ALL | ACTIVE | ARCHIVED
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  // Build Prisma where clause with strict tenant isolation
  const where: Prisma.CustomerWhereInput = {
    providerId,
  };

  // Status filter
  if (statusFilter === "ACTIVE" || statusFilter === "ARCHIVED") {
    where.status = statusFilter;
  }

  // Multi-field search filter (memberId4 OR name OR mobile)
  if (q) {
    where.OR = [
      { memberId4: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { status: "asc" }, // ACTIVE first, then ARCHIVED
          { createdAt: "desc" },
        ],
        include: {
          subscriptions: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              quota: true,
              mealsPerDay: true,
              startDate: true,
              endDate: true,
              status: true,
              plan: {
                select: { name: true },
              },
              mealRecords: {
                where: { status: "VALID" },
                select: { id: true },
              },
            },
          },
        },
      }),
      db.customer.count({ where }),
    ]);

    const formattedCustomers = customers.map((customer) => {
      const activeSub = customer.subscriptions[0] || null;
      let subscriptionSummary = null;

      if (activeSub) {
        const usedMeals = activeSub.mealRecords.length;
        const remainingMeals = Math.max(0, activeSub.quota - usedMeals);
        subscriptionSummary = {
          id: activeSub.id,
          planName: activeSub.plan?.name || "Custom Plan",
          quota: activeSub.quota,
          usedMeals,
          remainingMeals,
          status: activeSub.status,
          endDate: activeSub.endDate,
        };
      }

      return {
        id: customer.id,
        providerId: customer.providerId,
        memberId4: customer.memberId4,
        name: customer.name,
        mobile: customer.mobile,
        notes: customer.notes,
        status: customer.status,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        activeSubscription: subscriptionSummary,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      customers: formattedCustomers,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("[GET /api/customers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { providerId, id: userId } = auth.session.user;

  try {
    const body = await req.json();

    // 1. Validate payload shape with Zod
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { memberId4, name, mobile, notes } = parsed.data;

    // 2. Validate Member ID format (4 numeric digits)
    if (!isValidMemberIdFormat(memberId4)) {
      return NextResponse.json(
        { error: "Member ID must be exactly 4 numeric digits (1000–9999)." },
        { status: 400 }
      );
    }

    // 3. Pre-check Member ID availability
    const available = await isMemberIdAvailable(providerId, memberId4);
    if (!available) {
      return NextResponse.json(
        { error: `Member ID ${memberId4} is already assigned to another customer.` },
        { status: 409 }
      );
    }

    // 4. Create customer in DB
    const customer = await db.customer.create({
      data: {
        providerId,
        memberId4,
        name,
        mobile: mobile || null,
        notes: notes || null,
        status: "ACTIVE",
      },
    });

    // 5. Create Audit Log entry
    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "CUSTOMER_CREATED",
        entity: "Customer",
        entityId: customer.id,
        metadata: {
          memberId4: customer.memberId4,
          name: customer.name,
        },
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    // Handle Prisma unique constraint collision (P2002) for race condition safety
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Member ID is already taken. Please try another ID." },
        { status: 409 }
      );
    }

    console.error("[POST /api/customers] Error:", error);
    return NextResponse.json(
      { error: "Failed to create customer." },
      { status: 500 }
    );
  }
}
