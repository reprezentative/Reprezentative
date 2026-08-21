import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// Assigns an image URL to a product. mode "primary" (default) puts it first so
// it shows on the storefront; mode "add" appends it as an additional image.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const url = (body?.url ?? "").trim();
    const mode = body?.mode === "add" ? "add" : "primary";

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, images: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const others = (product.images ?? []).filter((i) => i !== url);
    const images = mode === "add" ? [...others, url] : [url, ...others];

    await prisma.product.update({
      where: { id: params.id },
      data: { images, inStock: true },
    });

    return NextResponse.json({ id: params.id, images }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Assign product image error:", error);
    }
    return NextResponse.json(
      { error: "Failed to assign image" },
      { status: 500 },
    );
  }
}
