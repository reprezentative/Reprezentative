import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logAudit } from "@/lib/audit";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const status = String(body?.status ?? "");
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const updated = await prisma.review.update({
      where: { id: params.id },
      data: { status: status as any },
    });
    await logAudit({
      action: "review.moderate",
      entity: "Review",
      entityId: updated.id,
      userId: auth.userId,
      userEmail: auth.email,
      meta: { status },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Update review error:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await prisma.review.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Delete review error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
