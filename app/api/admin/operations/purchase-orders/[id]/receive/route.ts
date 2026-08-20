import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { itemId, quantity, damaged } = body as {
      itemId?: string;
      quantity?: number;
      damaged?: number;
    };

    const goodQty = Number(quantity) || 0;
    const damagedQty = Number(damaged) || 0;

    if (!itemId || goodQty < 0 || damagedQty < 0 || goodQty + damagedQty <= 0) {
      return NextResponse.json(
        { error: "itemId and a positive received/damaged quantity are required" },
        { status: 400 },
      );
    }

    // Validate the item exists AND belongs to the PO in the URL before mutating.
    const preItem = await prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
      select: { id: true, purchaseOrderId: true, quantity: true, receivedQty: true },
    });
    if (!preItem) {
      return NextResponse.json({ error: "PO item not found" }, { status: 404 });
    }
    if (preItem.purchaseOrderId !== params.id) {
      return NextResponse.json(
        { error: "This item does not belong to the specified purchase order." },
        { status: 400 },
      );
    }
    const remaining = preItem.quantity - preItem.receivedQty;
    if (goodQty + damagedQty > remaining) {
      return NextResponse.json(
        { error: "Quantity exceeds the remaining amount for this item." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findUniqueOrThrow({
        where: { id: itemId },
      });

      const updatedItem = await tx.purchaseOrderItem.update({
        where: { id: itemId },
        data: {
          // Both good and damaged units count against the ordered quantity.
          receivedQty: { increment: goodQty + damagedQty },
          damagedQty: { increment: damagedQty },
        },
      });

      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
      });

      if (!variant) {
        throw new Error("Variant not found");
      }

      // Only undamaged units enter sellable stock.
      const previousStock = variant.stock;
      const newStock = previousStock + goodQty;

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: newStock,
          available: newStock - variant.reserved,
        },
      });

      await tx.stockHistory.create({
        data: {
          variantId: item.variantId,
          delta: goodQty,
          previousStock,
          newStock,
          reason: "po_receive",
          notes: `PO ${params.id} item ${itemId} received${
            damagedQty > 0 ? ` (${damagedQty} damaged)` : ""
          }`,
          userId: auth.userId ?? null,
        },
      });

      // If all items are fully received, mark PO as RECEIVED
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: params.id },
      });
      const allReceived = poItems.every(
        (i) => i.receivedQty >= i.quantity,
      );
      const anyReceived = poItems.some((i) => i.receivedQty > 0);

      if (allReceived) {
        await tx.purchaseOrder.update({
          where: { id: params.id },
          data: {
            status: "RECEIVED",
            receivedDate: new Date(),
          },
        });
      } else if (anyReceived) {
        await tx.purchaseOrder.update({
          where: { id: params.id },
          data: {
            status: "PARTIALLY_RECEIVED",
          },
        });
      }

      return updatedItem;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("PO receive error:", error);
    }
    return NextResponse.json(
      { error: "Failed to receive items for purchase order" },
      { status: 500 },
    );
  }
}



