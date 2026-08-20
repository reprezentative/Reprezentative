import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// Recomputes and persists a PO's subtotal/total from its line items.
async function recomputeTotals(tx: any, purchaseOrderId: string) {
  const items = await tx.purchaseOrderItem.findMany({
    where: { purchaseOrderId },
    select: { quantity: true, unitCost: true },
  });
  const subtotal = items.reduce(
    (sum: number, i: any) => sum + i.quantity * i.unitCost,
    0,
  );
  const po = await tx.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { freight: true, duties: true, otherCosts: true },
  });
  const total =
    subtotal + (po?.freight ?? 0) + (po?.duties ?? 0) + (po?.otherCosts ?? 0);
  await tx.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { subtotal, total },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { variantId, quantity, unitCost } = body as {
      variantId?: string;
      quantity?: number;
      unitCost?: number;
    };

    const qty = Number(quantity);
    const cost = Number(unitCost);

    if (!variantId || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) {
      return NextResponse.json(
        { error: "variantId, a positive quantity, and a valid unit cost are required" },
        { status: 400 },
      );
    }

    const [po, variant] = await Promise.all([
      prisma.purchaseOrder.findUnique({
        where: { id: params.id },
        select: { id: true },
      }),
      prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      }),
    ]);

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: params.id,
          variantId,
          quantity: qty,
          unitCost: cost,
        },
        select: { id: true },
      });
      await recomputeTotals(tx, params.id);
      return created;
    });

    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Add PO item error:", error);
    }
    return NextResponse.json(
      { error: "Failed to add item to purchase order" },
      { status: 500 },
    );
  }
}
