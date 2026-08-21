import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const returns = await prisma.return.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });
    return NextResponse.json({ returns });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("List returns error:", error);
    return NextResponse.json({ error: "Failed to load returns" }, { status: 500 });
  }
}
