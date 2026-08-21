import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.collection.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};
    if (typeof body.name === "string" && body.name.trim())
      data.name = body.name.trim();
    if (typeof body.description === "string") data.description = body.description || null;
    if (typeof body.image === "string") data.image = body.image || null;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder) || 0;
    if (Array.isArray(body.productIds)) {
      data.products = { set: body.productIds.map((id: string) => ({ id })) };
    }

    await prisma.collection.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: params.id }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Update collection error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update collection" },
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

  try {
    await prisma.collection.delete({ where: { id: params.id } });
    return NextResponse.json({ id: params.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 },
    );
  }
}
