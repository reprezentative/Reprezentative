import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Shared admin authorization guard for API route handlers.
 *
 * Usage:
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 *   const { userId } = auth; // authenticated admin's user id
 *
 * This centralizes the `getServerSession + role === "ADMIN"` check so every
 * /api/admin/* route enforces authorization consistently.
 */
export type AdminAuthResult =
  | { ok: true; userId: string | undefined; email: string | undefined }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);

  if (!session || (session as any)?.user?.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true,
    userId: (session as any)?.user?.id,
    email: (session as any)?.user?.email,
  };
}
