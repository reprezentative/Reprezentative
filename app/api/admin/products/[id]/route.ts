import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = params;

  try {
    const body = await req.json();

    const {
      name,
      slug,
      description,
      price,
      sku,
      category,
      imageUrl,
      images: imagesInput,
      featured,
      isNew,
      inStock,
      status,
      tags,
    } = body as {
      name?: string;
      slug?: string;
      description?: string;
      price?: number;
      sku?: string;
      category?: string;
      imageUrl?: string;
      images?: string[];
      featured?: boolean;
      isNew?: boolean;
      inStock?: boolean;
      status?: string;
      tags?: string[];
    };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Prefer an explicit images[] array; fall back to legacy single imageUrl.
    const images = Array.isArray(imagesInput)
      ? imagesInput.filter((u) => typeof u === "string" && u.length > 0)
      : imageUrl && imageUrl.length > 0
        ? [imageUrl]
        : existing.images;

    const VALID_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED"];

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        slug: slug ?? existing.slug,
        description: description ?? existing.description,
        price: typeof price === "number" ? price : existing.price,
        sku: sku ?? existing.sku,
        category: category ?? existing.category,
        images,
        featured: typeof featured === "boolean" ? featured : existing.featured,
        isNew: typeof isNew === "boolean" ? isNew : existing.isNew,
        inStock: typeof inStock === "boolean" ? inStock : existing.inStock,
        status:
          status && VALID_STATUS.includes(status)
            ? (status as any)
            : existing.status,
        tags: Array.isArray(tags)
          ? tags.map((t) => String(t).trim()).filter(Boolean)
          : existing.tags,
      },
    });

    return NextResponse.json({ id: updated.id }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Update product error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = params;

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // A product that has been ordered must be preserved for order history.
    // Guide the admin to mark it out of stock instead of deleting.
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: id },
    });
    if (orderItemCount > 0) {
      return NextResponse.json(
        {
          error:
            "This product has existing orders and cannot be deleted. Mark it out of stock instead.",
        },
        { status: 409 },
      );
    }

    // Remove relations that do not cascade on delete, then the product
    // (variants and cart items cascade automatically).
    await prisma.$transaction([
      prisma.productCOGS.deleteMany({ where: { productId: id } }),
      prisma.supplierProduct.deleteMany({ where: { productId: id } }),
      prisma.wishlistItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ id }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Delete product error:", error);
    }
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}



