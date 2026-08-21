import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [carts, emailLog] = await Promise.all([
    prisma.abandonedCart.findMany({
      where: { recovered: false },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return NextResponse.json({ carts, emailLog }, { status: 200 });
}
