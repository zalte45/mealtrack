/**
 * /api/customers/[id]
 *
 * GET    - Fetch single customer details with subscription snapshot.
 * PATCH  - Update customer (Name, Mobile, Notes, Status). Member ID is permanent.
 * DELETE - Soft delete (archive) customer to preserve historical records.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { UpdateCustomerSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId } = auth.session.user;

  try {
    const customer = await db.customer.findFirst({
      where: {
        id,
        providerId,
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: { select: { name: true } },
            mealRecords: {
              where: { status: "VALID" },
              select: { id: true },
            },
          },
        },
        _count: {
          select: {
            mealRecords: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error(`[GET /api/customers/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch customer details." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId, id: userId } = auth.session.user;

  try {
    const body = await req.json();

    // 1. Validate payload shape
    const parsed = UpdateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 2. Check existence & tenant isolation
    const existing = await db.customer.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const { name, mobile, notes, status } = parsed.data;

    // 3. Update fields (Member ID is explicitly NOT modified — permanent identifier)
    const updated = await db.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile: mobile || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status !== undefined && { status }),
      },
    });

    // 4. Create Audit Log
    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: status && status !== existing.status ? `CUSTOMER_STATUS_${status}` : "CUSTOMER_UPDATED",
        entity: "Customer",
        entityId: id,
        metadata: {
          previousStatus: existing.status,
          newStatus: updated.status,
          memberId4: updated.memberId4,
        },
      },
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error(`[PATCH /api/customers/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update customer." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { providerId, id: userId } = auth.session.user;

  try {
    const existing = await db.customer.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    // Soft delete (archive) instead of hard deleting (BR-003, BR-012)
    const archived = await db.customer.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    // Create Audit Log
    await db.auditLog.create({
      data: {
        providerId,
        actorId: userId,
        action: "CUSTOMER_ARCHIVED",
        entity: "Customer",
        entityId: id,
        metadata: {
          memberId4: existing.memberId4,
          name: existing.name,
        },
      },
    });

    return NextResponse.json({
      message: "Customer successfully archived.",
      customer: archived,
    });
  } catch (error) {
    console.error(`[DELETE /api/customers/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to archive customer." },
      { status: 500 }
    );
  }
}
