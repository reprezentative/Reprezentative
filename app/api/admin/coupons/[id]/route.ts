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
    const data: any = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if (body.value != null) data.value = Number(body.value) || 0;
    await prisma.coupon.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: params.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await prisma.coupon.delete({ where: { id: params.id } });
    return NextResponse.json({ id: params.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
