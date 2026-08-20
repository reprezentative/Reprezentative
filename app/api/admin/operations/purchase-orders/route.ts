import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { supplierId, expectedDate } = body as {
      supplierId?: string;
      expectedDate?: string;
    };

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId is required" },
        { status: 400 },
      );
    }

    const poNumber = `PO-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Create PO error:", error);
    }
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 },
    );
  }
}



