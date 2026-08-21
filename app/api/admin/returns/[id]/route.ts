import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"];

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
    const updated = await prisma.return.update({
      where: { id: params.id },
      data: { status: status as any },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Update return error:", error);
    return NextResponse.json({ error: "Failed to update return" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await prisma.return.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Delete return error:", error);
    return NextResponse.json({ error: "Failed to delete return" }, { status: 500 });
  }
}
