import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// Lightweight product list for pickers (e.g. assigning a media image).
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images?.[0] ?? null,
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
      // Optional initial COGS captured on the product form.
      fabricCost,
      laborCost,
      freightCost,
      inventoryCost,
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
      fabricCost?: number;
      laborCost?: number;
      freightCost?: number;
      inventoryCost?: number;
    };

    // Note: price === 0 is valid (e.g. a free gift), so check for null/undefined.
    if (
      !name ||
      !slug ||
      !description ||
      price == null ||
      typeof price !== "number" ||
      !sku ||
      !category
    ) {
      return NextResponse.json(
        { error: "Missing required product fields" },
        { status: 400 },
      );
    }

    const cleanImages = Array.isArray(imagesInput)
      ? imagesInput.filter((u) => typeof u === "string" && u.trim().length > 0)
      : imageUrl && imageUrl.trim().length > 0
        ? [imageUrl.trim()]
        : [];
    const VALID_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED"];

    const initialCogs = {
      fabricCost: Number(fabricCost) || 0,
      laborCost: Number(laborCost) || 0,
      freightCost: Number(freightCost) || 0,
      inventoryCost: Number(inventoryCost) || 0,
    };
    const hasCogs =
      initialCogs.fabricCost +
        initialCogs.laborCost +
        initialCogs.freightCost +
        initialCogs.inventoryCost >
      0;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          slug,
          description,
          price,
          compareAtPrice: null,
          sku,
          material: "",
          fit: "REGULAR",
          category,
          // No fake stock photos — only store images that were provided.
          images: cleanImages,
          colors: [{ name: "Default", hex: "#000000", available: true }] as any,
          sizes: [{ name: "One Size", available: true }] as any,
          featured: !!featured,
          isNew: isNew ?? true,
          inStock: inStock ?? true,
          status:
            status && VALID_STATUS.includes(status) ? (status as any) : "ACTIVE",
          tags: Array.isArray(tags)
            ? tags.map((t) => String(t).trim()).filter(Boolean)
            : [],
        },
      });

      // Create a default variant so the product is trackable in Inventory and
      // can be targeted by purchase orders. Admins refine variants later.
      await tx.productVariant.create({
        data: {
          productId: created.id,
          color: "Default",
          colorHex: "#000000",
          size: "One Size",
          stock: 0,
          reserved: 0,
          available: 0,
          sku: `${sku}-DEFAULT`,
        },
      });

      // Persist initial COGS so the Finance Hub reflects it immediately.
      if (hasCogs) {
        const totalCOGS =
          initialCogs.fabricCost +
          initialCogs.laborCost +
          initialCogs.freightCost +
          initialCogs.inventoryCost;
        await tx.productCOGS.create({
          data: {
            productId: created.id,
            fabricCost: initialCogs.fabricCost,
            fabricYards: 0,
            trimsCost: 0,
            packagingCost: 0,
            laborCost: initialCogs.laborCost,
            patternCost: 0,
            gradingCost: 0,
            sampleCost: 0,
            printingCost: 0,
            qcCost: 0,
            freightCost: initialCogs.freightCost,
            dutiesCost: 0,
            brokerageCost: 0,
            domesticShipping: 0,
            warehousingCost: initialCogs.inventoryCost,
            handlingCost: 0,
            shrinkageRate: 0,
            totalCOGS,
            effectiveDate: new Date(),
            notes: "Initial COGS captured at product creation.",
          },
        });
      }

      return created;
    });

    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Create product error:", error);
    }
    // Surface duplicate slug/SKU as a helpful 409 rather than a generic 500.
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A product with this slug or SKU already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
