import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { generateSecret, otpauthURL, verifyTOTP } from "@/lib/totp";

export const runtime = "nodejs";

// POST { action: "setup" | "enable" | "disable", token? }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!auth.userId) {
    return NextResponse.json({ error: "No user" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  if (action === "setup") {
    // Generate + persist a secret (not yet enabled) and return provisioning info.
    const secret = generateSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    return NextResponse.json({
      secret,
      otpauth: otpauthURL(secret, user.email),
    });
  }

  if (action === "enable") {
    const token = String(body?.token ?? "");
    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: "Run setup first" }, { status: 400 });
    }
    if (!verifyTOTP(user.twoFactorSecret, token)) {
      return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    return NextResponse.json({ ok: true, enabled: true });
  }

  if (action === "disable") {
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return NextResponse.json({ ok: true, enabled: false });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
