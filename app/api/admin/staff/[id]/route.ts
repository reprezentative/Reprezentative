import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const ROLES = ["CUSTOMER", "STAFF", "ADMIN"];

// Promote/demote a team member and set their granular permissions.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const role = body?.role != null ? String(body.role) : undefined;
    const permsInput = Array.isArray(body?.permissions)
      ? body.permissions
      : undefined;

    if (role !== undefined && !ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Guard: never let an admin strip the last remaining admin.
    if (role !== undefined && role !== "ADMIN") {
      const target = await prisma.user.findUnique({
        where: { id: params.id },
        select: { role: true },
      });
      if (target?.role === "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "You can't remove the last admin." },
            { status: 400 },
          );
        }
      }
    }

    const permissions = permsInput
      ? permsInput
          .map((p: unknown) => String(p))
          .filter((p: string) => ALL_PERMISSION_KEYS.includes(p as any))
      : undefined;

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role !== undefined ? { role: role as any } : {}),
        ...(permissions !== undefined ? { permissions } : {}),
      },
      select: { id: true, role: true, permissions: true },
    });

    await logAudit({
      action: "staff.update",
      entity: "User",
      entityId: updated.id,
      userId: auth.userId,
      userEmail: auth.email,
      meta: { role: updated.role, permissions: updated.permissions },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Staff update error:", error);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}
