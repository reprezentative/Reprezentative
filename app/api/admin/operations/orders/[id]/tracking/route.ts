import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { trackingNumber, carrier } = body as {
      trackingNumber?: string;
      carrier?: string;
    };

    if (!trackingNumber || !carrier) {
      return NextResponse.json(
        { error: "Tracking number and carrier are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { shippedAt: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date();

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingNumber,
        carrier,
        // Stamp the ship date only on first assignment — don't reset it when
        // an admin later corrects the tracking number.
        shippedAt: existing.shippedAt ?? now,
        // Advance an unshipped order to SHIPPED, but never downgrade a
        // delivered/cancelled/refunded order.
        status:
          existing.status === "PENDING" || existing.status === "PROCESSING"
            ? "SHIPPED"
            : existing.status,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Update tracking error:", error);
    return NextResponse.json(
      { error: "Failed to update tracking" },
      { status: 500 },
    );
  }
}



