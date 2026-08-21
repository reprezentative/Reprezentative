import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

const KEY = "size_charts";

// Size charts are stored as a single settings row: { charts: [{id,name,csv}] }.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const charts = (row?.value as any)?.charts ?? [];
  return NextResponse.json({ charts }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const charts = Array.isArray(body?.charts) ? body.charts : [];
    // Normalize entries.
    const clean = charts
      .map((c: any) => ({
        id: String(c.id || Math.random().toString(36).slice(2)),
        name: String(c.name || "Size chart").trim(),
        csv: String(c.csv || ""),
      }))
      .filter((c: any) => c.name);

    await prisma.setting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: { charts: clean } as any },
      update: { value: { charts: clean } as any },
    });

    return NextResponse.json({ charts: clean }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Save size charts error:", error);
    }
    return NextResponse.json(
      { error: "Failed to save size charts" },
      { status: 500 },
    );
  }
}
