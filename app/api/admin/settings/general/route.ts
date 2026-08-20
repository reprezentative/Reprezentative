import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const SETTINGS_KEY = "general";

type HomepageLayout = "ralph" | "drop";

type GeneralSettings = {
  storeName: string;
  supportEmail: string;
  defaultCurrency: string;
  timezone: string;
  enableWishlist: boolean;
  enableAiAssistant: boolean;
  homepageLayout: HomepageLayout;
};

const DEFAULT_SETTINGS: GeneralSettings = {
  storeName: "Reprezentative",
  supportEmail: "support@example.com",
  defaultCurrency: "USD",
  timezone: "America/New_York",
  enableWishlist: true,
  enableAiAssistant: true,
  homepageLayout: "ralph",
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const row = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
  });

  const value = row?.value ?? DEFAULT_SETTINGS;

  return NextResponse.json(value, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as Partial<GeneralSettings>;

    // Merge over the CURRENTLY stored settings (not just defaults) so a partial
    // update — e.g. only { homepageLayout } from the Content Manager — never
    // wipes out storeName/supportEmail/etc.
    const existingRow = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    const existing = (existingRow?.value as Partial<GeneralSettings>) ?? {};

    const merged: GeneralSettings = {
      ...DEFAULT_SETTINGS,
      ...existing,
      ...body,
    };

    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      create: {
        key: SETTINGS_KEY,
        value: merged as any,
      },
      update: {
        value: merged as any,
      },
    });

    return NextResponse.json(merged, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Update general settings error:", error);
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}


