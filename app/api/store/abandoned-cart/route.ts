import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Public: the storefront calls this when a shopper enters their email at
// checkout, so we can follow up if they don't complete the order.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email ?? "").trim().toLowerCase();
    const items = Array.isArray(body?.items) ? body.items : [];
    const subtotal = Number(body?.subtotal) || 0;

    if (!email || !email.includes("@") || items.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await prisma.abandonedCart.upsert({
      where: { email },
      create: { email, items, subtotal, recovered: false },
      update: { items, subtotal, recovered: false },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
