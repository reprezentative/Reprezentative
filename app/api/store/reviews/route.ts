import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: list APPROVED reviews for a product (by slug) + aggregate rating.
export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ reviews: [], average: 0, count: 0 });
  }
  const reviews = await prisma.review.findMany({
    where: { productId: product.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
    },
  });
  const count = reviews.length;
  const average =
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
  return NextResponse.json({ reviews, average, count });
}

// Public: submit a review (moderated — created as PENDING).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = String(body?.slug ?? "").trim();
    const rating = Math.round(Number(body?.rating) || 0);
    const authorName = String(body?.authorName ?? "").trim().slice(0, 80);
    const title = body?.title ? String(body.title).trim().slice(0, 120) : null;
    const text = String(body?.body ?? "").trim().slice(0, 2000);

    if (!slug) {
      return NextResponse.json({ error: "Product is required" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
    }
    if (!authorName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "Review text is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id ?? null;

    await prisma.review.create({
      data: {
        productId: product.id,
        userId,
        authorName,
        rating,
        title,
        body: text,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { ok: true, message: "Thanks — your review will appear once approved." },
      { status: 201 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Review submit error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
