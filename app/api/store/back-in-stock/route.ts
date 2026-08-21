import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Public: register interest in a sold-out size.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = String(body?.slug ?? "").trim();
    const size = String(body?.size ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!slug || !size) {
      return NextResponse.json({ error: "Missing product or size" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { variants: { where: { discontinued: false } } },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const variant = product.variants.find(
      (v) => v.size.toLowerCase() === size.toLowerCase(),
    );
    if (!variant) {
      return NextResponse.json({ error: "Size not found" }, { status: 404 });
    }

    // Avoid duplicate open requests for the same email+variant.
    const existing = await prisma.backInStockRequest.findFirst({
      where: { variantId: variant.id, email, notified: false },
    });
    if (!existing) {
      await prisma.backInStockRequest.create({
        data: { variantId: variant.id, email },
      });
    }

    return NextResponse.json(
      { ok: true, message: "We'll email you when it's back." },
      { status: 201 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Back-in-stock error:", error);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
