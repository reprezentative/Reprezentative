import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

// List a product's variants.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const variants = await prisma.productVariant.findMany({
    where: { productId: params.id },
    orderBy: [{ color: "asc" }, { size: "asc" }],
  });
  return NextResponse.json({ variants }, { status: 200 });
}

// Add a size/color variant to a product.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, sku: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();
    const size = (body?.size ?? "").trim();
    const color = (body?.color ?? "").trim() || "Default";
    const colorHex = (body?.colorHex ?? "").trim() || "#000000";
    const stock = Math.max(0, Math.floor(Number(body?.stock) || 0));

    if (!size) {
      return NextResponse.json({ error: "Size is required" }, { status: 400 });
    }

    // Prevent duplicate size+color.
    const existing = await prisma.productVariant.findFirst({
      where: { productId: params.id, color, size },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A "${color} / ${size}" variant already exists.` },
        { status: 409 },
      );
    }

    // Build a unique SKU: <productSku>-<COLOR>-<SIZE>, de-collided if needed.
    const sanitize = (s: string) =>
      s.toUpperCase().replace(/[^A-Z0-9]/g, "") || "X";
    let sku = `${product.sku}-${sanitize(color)}-${sanitize(size)}`;
    if (await prisma.productVariant.findUnique({ where: { sku } })) {
      sku = `${sku}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: params.id,
        color,
        colorHex,
        size,
        stock,
        reserved: 0,
        available: stock,
        sku,
      },
    });

    // Keep the product marked in-stock if it now has stock.
    if (stock > 0) {
      await prisma.product.update({
        where: { id: params.id },
        data: { inStock: true },
      });
    }

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Add variant error:", error);
    }
    return NextResponse.json({ error: "Failed to add variant" }, { status: 500 });
  }
}
