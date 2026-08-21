import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const code = (body?.code ?? "").trim().toUpperCase();
    const type = body?.type;
    const value = Number(body?.value) || 0;

    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
    if (!["PERCENT", "FIXED", "FREE_SHIPPING"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (await prisma.coupon.findUnique({ where: { code } })) {
      return NextResponse.json({ error: "That code already exists." }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type,
        value: type === "FREE_SHIPPING" ? 0 : value,
        active: body?.active !== false,
        minSubtotal: body?.minSubtotal != null && body.minSubtotal !== "" ? Number(body.minSubtotal) : null,
        maxRedemptions: body?.maxRedemptions != null && body.maxRedemptions !== "" ? Number(body.maxRedemptions) : null,
        startsAt: body?.startsAt ? new Date(body.startsAt) : null,
        endsAt: body?.endsAt ? new Date(body.endsAt) : null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: coupon.id }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Create coupon error:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
