import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { variantId, newStock, reason, notes } = body as {
      variantId?: string;
      newStock?: number;
      reason?: string;
      notes?: string;
    };

    if (!variantId || typeof newStock !== "number") {
      return NextResponse.json(
        { error: "variantId and newStock are required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new Error("Variant not found");
      }

      const previousStock = variant.stock;
      const delta = newStock - previousStock;

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stock: newStock,
          available: newStock - variant.reserved,
        },
      });

      await tx.stockHistory.create({
        data: {
          variantId,
          delta,
          previousStock,
          newStock,
          reason: reason ?? "manual_adjustment",
          notes,
        },
      });

      return updated;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Stock update error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 },
    );
  }
}



