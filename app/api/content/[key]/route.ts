import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET is intentionally public: the storefront reads published content here.
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } },
) {
  const { key } = params;

  const existing = await prisma.content.findUnique({
    where: { key },
  });

  if (!existing) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      data: existing.data,
      published: existing.published,
      version: existing.version,
    },
    { status: 200 },
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { key: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { key } = params;

  try {
    const body = await req.json();

    const data = body?.data ?? {};

    const existing = await prisma.content.findUnique({
      where: { key },
    });

    const record = existing
      ? await prisma.content.update({
          where: { key },
          data: {
            data,
            version: existing.version + 1,
          },
        })
      : await prisma.content.create({
          data: {
            key,
            data,
            published: true,
          },
        });

    return NextResponse.json(
      { data: record.data, published: record.published, version: record.version },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Content update error:", error);
    }
    return NextResponse.json(
      { error: "Failed to save content" },
      { status: 500 },
    );
  }
}



