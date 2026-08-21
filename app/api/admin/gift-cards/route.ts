import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

function genCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GC-${part()}-${part()}`;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const giftCards = await prisma.giftCard.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ giftCards }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const amount = Number(body?.amount) || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }
    let code = (body?.code ?? "").trim().toUpperCase() || genCode();
    if (await prisma.giftCard.findUnique({ where: { code } })) {
      code = genCode();
    }
    const gc = await prisma.giftCard.create({
      data: { code, initialBalance: amount, balance: amount, active: true },
      select: { id: true, code: true },
    });
    return NextResponse.json({ id: gc.id, code: gc.code }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Create gift card error:", error);
    return NextResponse.json({ error: "Failed to create gift card" }, { status: 500 });
  }
}
