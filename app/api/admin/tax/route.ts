import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const row = await prisma.setting.findUnique({ where: { key: "tax" } });
  const v = (row?.value as any) ?? {};
  return NextResponse.json({
    enabled: v.enabled ?? false,
    // Stored as a fraction; expose as a percent for the UI.
    ratePercent: v.rate != null ? Number(v.rate) * 100 : 0,
    label: v.label ?? "Sales tax",
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const enabled = !!body?.enabled;
    const ratePercent = Math.max(0, Math.min(100, Number(body?.ratePercent) || 0));
    const label = body?.label ? String(body.label).slice(0, 60) : "Sales tax";
    const rate = Math.round((ratePercent / 100) * 100000) / 100000;

    await prisma.setting.upsert({
      where: { key: "tax" },
      create: { key: "tax", value: { enabled, rate, label } },
      update: { value: { enabled, rate, label } },
    });

    await logAudit({
      action: "settings.tax_update",
      entity: "Setting",
      entityId: "tax",
      userId: auth.userId,
      userEmail: auth.email,
      meta: { enabled, ratePercent, label },
    });

    return NextResponse.json({ ok: true, enabled, ratePercent, label });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Tax settings error:", error);
    return NextResponse.json({ error: "Failed to save tax settings" }, { status: 500 });
  }
}
