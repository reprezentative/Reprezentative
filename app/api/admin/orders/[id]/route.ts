import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { refundPayment } from "@/lib/payments";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

const CLOSED = new Set(["CANCELLED", "REFUNDED"]);

// Updates an order's status. Transitioning into CANCELLED/REFUNDED returns the
// order's units to sellable inventory (with an audit trail). The monetary
// refund itself is processed in Stripe — this endpoint keeps records in sync.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { status } = body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { error: "A valid status is required" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === status) {
      return NextResponse.json({ id: order.id, status }, { status: 200 });
    }

    const nowClosing = CLOSED.has(status) && !CLOSED.has(order.status);

    // Issue a Stripe refund when refunding (no-op if Stripe/intent absent).
    let refunded = false;
    if (status === "REFUNDED" && order.stripePaymentIntentId) {
      const r = await refundPayment(order.stripePaymentIntentId, order.total);
      refunded = r.refunded;
      if (!r.ok) {
        return NextResponse.json(
          { error: `Stripe refund failed: ${r.error}` },
          { status: 502 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: params.id },
        data: {
          status: status as any,
          ...(status === "DELIVERED" && !order.deliveredAt
            ? { deliveredAt: new Date() }
            : {}),
        },
      });

      // Restock inventory when an order is cancelled or refunded.
      if (nowClosing) {
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: item.color,
              size: item.size,
            },
          });
          if (!variant) continue;

          const previousStock = variant.stock;
          const newStock = previousStock + item.quantity;
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock, available: newStock - variant.reserved },
          });
          await tx.stockHistory.create({
            data: {
              variantId: variant.id,
              delta: item.quantity,
              previousStock,
              newStock,
              reason: status === "REFUNDED" ? "order_refunded" : "order_cancelled",
              notes: `Order ${order.orderNumber} ${status.toLowerCase()}`,
              userId: auth.userId ?? null,
            },
          });
        }
      }
    });

    await logAudit({
      action: "order.status_change",
      entity: "Order",
      entityId: order.id,
      userId: auth.userId,
      userEmail: auth.email,
      meta: {
        orderNumber: order.orderNumber,
        from: order.status,
        to: status,
        restocked: nowClosing,
        refunded,
      },
    });

    return NextResponse.json(
      {
        id: order.id,
        status,
        restocked: nowClosing,
        refunded,
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Update order status error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}
