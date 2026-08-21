import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// Delete a variant from a product.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; variantId: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: params.variantId },
      select: { id: true, productId: true },
    });
    if (!variant || variant.productId !== params.id) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    // A variant referenced by purchase orders can't be removed cleanly.
    const poCount = await prisma.purchaseOrderItem.count({
      where: { variantId: params.variantId },
    });
    if (poCount > 0) {
      return NextResponse.json(
        {
          error:
            "This variant is used by purchase orders and can't be deleted. Set its stock to 0 instead.",
        },
        { status: 409 },
      );
    }

    // stock_history rows cascade on variant delete (per schema).
    await prisma.productVariant.delete({ where: { id: params.variantId } });

    return NextResponse.json({ id: params.variantId }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Delete variant error:", error);
    }
    return NextResponse.json(
      { error: "Failed to delete variant" },
      { status: 500 },
    );
  }
}
