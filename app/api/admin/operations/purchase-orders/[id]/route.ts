import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { status } = body as { status?: string };

    const VALID = [
      "DRAFT",
      "SENT",
      "CONFIRMED",
      "IN_PRODUCTION",
      "SHIPPED",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED",
    ];
    if (!status || !VALID.includes(status)) {
      return NextResponse.json(
        { error: "A valid status is required" },
        { status: 400 },
      );
    }

    const po = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: status as any },
      select: { id: true, status: true },
    });

    return NextResponse.json(po, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Update PO status error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 },
    );
  }
}



