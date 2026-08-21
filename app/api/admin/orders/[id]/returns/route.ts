import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { refundPayment } from "@/lib/payments";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const reqItems: { orderItemId: string; quantity: number }[] = Array.isArray(
      body?.items,
    )
      ? body.items
      : [];
    const restock = body?.restock !== false;
    const refundAmount = Number(body?.refundAmount) || 0;
    const refundNow = !!body?.refundNow;
    const reason = body?.reason ? String(body.reason) : null;

    if (reqItems.length === 0) {
      return NextResponse.json({ error: "Select at least one item to return" }, { status: 400 });
    }

    // Stripe refund first (if requested) so we don't mark returned on failure.
    let refunded = false;
    if (refundNow && refundAmount > 0 && order.stripePaymentIntentId) {
      const r = await refundPayment(order.stripePaymentIntentId, refundAmount);
      if (!r.ok) {
        return NextResponse.json({ error: `Refund failed: ${r.error}` }, { status: 502 });
      }
      refunded = r.refunded;
    }

    const ret = await prisma.$transaction(async (tx) => {
      const created = await tx.return.create({
        data: {
          orderId: order.id,
          status: refundNow ? "REFUNDED" : "REQUESTED",
          reason,
          items: reqItems as any,
          refundAmount: refundAmount || null,
          restock,
        },
      });

      if (restock) {
        for (const ri of reqItems) {
          const item = order.items.find((i) => i.id === ri.orderItemId);
          if (!item) continue;
          const qty = Math.max(0, Math.floor(ri.quantity) || 0);
          if (qty <= 0) continue;
          const variant = await tx.productVariant.findFirst({
            where: { productId: item.productId, color: item.color, size: item.size },
          });
          if (!variant) continue;
          const newStock = variant.stock + qty;
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock, available: newStock - variant.reserved },
          });
          await tx.stockHistory.create({
            data: {
              variantId: variant.id,
              delta: qty,
              previousStock: variant.stock,
              newStock,
              reason: "return_restock",
              notes: `Return for ${order.orderNumber}`,
              userId: auth.userId ?? null,
            },
          });
        }
      }

      if (refundNow) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "REFUNDED" },
        });
      }

      return created;
    });

    await logAudit({
      action: "return.create",
      entity: "Order",
      entityId: order.id,
      userId: auth.userId,
      userEmail: auth.email,
      meta: {
        orderNumber: order.orderNumber,
        refundAmount,
        refunded,
        restock,
      },
    });

    return NextResponse.json({ id: ret.id, refunded }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Create return error:", error);
    return NextResponse.json({ error: "Failed to create return" }, { status: 500 });
  }
}
