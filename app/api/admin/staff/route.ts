import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// List staff/admin users (team members). Customers are excluded.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

// Invite a team member: creates a new user or upgrades an existing one.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;
    const role = ["STAFF", "ADMIN"].includes(String(body?.role))
      ? String(body.role)
      : "STAFF";
    const password = String(body?.password ?? "");
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions
          .map((p: unknown) => String(p))
          .filter((p: string) => ALL_PERMISSION_KEYS.includes(p as any))
      : [];

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { email },
        data: { role: role as any, permissions, ...(name ? { name } : {}) },
        select: { id: true, email: true, role: true },
      });
    } else {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Set a password of at least 8 characters for the new member." },
          { status: 400 },
        );
      }
      const hashed = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashed,
          role: role as any,
          permissions,
        },
        select: { id: true, email: true, role: true },
      });
    }

    await logAudit({
      action: existing ? "staff.upgrade" : "staff.create",
      entity: "User",
      entityId: user.id,
      userId: auth.userId,
      userEmail: auth.email,
      meta: { email, role },
    });

    return NextResponse.json(user, { status: existing ? 200 : 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Staff create error:", error);
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
  }
}
