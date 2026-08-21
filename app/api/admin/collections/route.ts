import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const collections = await prisma.collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { products: { select: { id: true } } },
  });

  return NextResponse.json(
    {
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        productIds: c.products.map((p) => p.id),
        productCount: c.products.length,
      })),
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const name = (body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    let slug = (body?.slug ?? "").trim() || slugify(name);
    if (!slug) slug = `collection-${Date.now().toString(36)}`;
    if (await prisma.collection.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }

    const productIds: string[] = Array.isArray(body?.productIds)
      ? body.productIds
      : [];

    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description: body?.description || null,
        image: body?.image || null,
        isActive: body?.isActive !== false,
        sortOrder: Number(body?.sortOrder) || 0,
        products: productIds.length
          ? { connect: productIds.map((id) => ({ id })) }
          : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: collection.id }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Create collection error:", error);
    }
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 },
    );
  }
}
