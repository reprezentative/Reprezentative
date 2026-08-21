import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { sendEmail } from "@/lib/email";
import { abandonedCartEmail } from "@/lib/email-templates";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const cart = await prisma.abandonedCart.findUnique({ where: { id: params.id } });
  if (!cart) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mail = abandonedCartEmail(cart.email, (cart.items as any) ?? []);
  const result = await sendEmail({
    to: cart.email,
    subject: mail.subject,
    html: mail.html,
    template: "abandoned_cart",
  });

  await prisma.abandonedCart.update({
    where: { id: params.id },
    data: { remindedAt: new Date() },
  });

  return NextResponse.json(
    { ok: true, sent: result.sent, skipped: result.skipped },
    { status: 200 },
  );
}
