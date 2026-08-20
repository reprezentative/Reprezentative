import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const COST_FIELDS = [
  "fabricCost",
  "fabricYards",
  "trimsCost",
  "packagingCost",
  "laborCost",
  "patternCost",
  "gradingCost",
  "sampleCost",
  "printingCost",
  "qcCost",
  "freightCost",
  "dutiesCost",
  "brokerageCost",
  "domesticShipping",
  "warehousingCost",
  "handlingCost",
  "shrinkageRate",
  "totalCOGS",
] as const;

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Returns the latest COGS entry for a product (used to pre-fill the form).
export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const latest = await prisma.productCOGS.findFirst({
    where: { productId: params.productId },
    orderBy: { effectiveDate: "desc" },
  });

  return NextResponse.json({ cogs: latest }, { status: 200 });
}

// Creates a new COGS entry (cost structures are versioned by effectiveDate).
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();

    const data: Record<string, number> = {};
    for (const field of COST_FIELDS) {
      data[field] = toNumber(body[field]);
    }

    const entry = await prisma.productCOGS.create({
      data: {
        productId: params.productId,
        ...(data as any),
        effectiveDate: body.effectiveDate
          ? new Date(body.effectiveDate)
          : new Date(),
        notes: typeof body.notes === "string" ? body.notes : null,
      },
    });

    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Save COGS error:", error);
    }
    return NextResponse.json(
      { error: "Failed to save COGS entry" },
      { status: 500 },
    );
  }
}
