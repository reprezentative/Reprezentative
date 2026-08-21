import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const requests = await prisma.backInStockRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      variant: {
        select: {
          size: true,
          color: true,
          stock: true,
          available: true,
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });
  return NextResponse.json({ requests });
}
