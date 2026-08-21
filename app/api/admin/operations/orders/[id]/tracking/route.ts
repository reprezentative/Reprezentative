import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { sendEmail } from "@/lib/email";
import { shippingEmail } from "@/lib/email-templates";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { trackingNumber, carrier } = body as {
      trackingNumber?: string;
      carrier?: string;
    };

    if (!trackingNumber || !carrier) {
      return NextResponse.json(
        { error: "Tracking number and carrier are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { shippedAt: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const firstShipment = !existing.shippedAt;

    const now = new Date();

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingNumber,
        carrier,
        // Stamp the ship date only on first assignment — don't reset it when
        // an admin later corrects the tracking number.
        shippedAt: existing.shippedAt ?? now,
        // Advance an unshipped order to SHIPPED, but never downgrade a
        // delivered/cancelled/refunded order.
        status:
          existing.status === "PENDING" || existing.status === "PROCESSING"
            ? "SHIPPED"
            : existing.status,
      },
    });

    // Notify the customer on first shipment (best-effort; dormant w/o email key).
    if (firstShipment) {
      try {
        const full = await prisma.order.findUnique({
          where: { id: params.id },
          include: { user: { select: { email: true } } },
        });
        if (full?.user?.email) {
          const mail = shippingEmail({
            orderNumber: full.orderNumber,
            total: full.total,
            subtotal: full.subtotal,
            shipping: full.shipping,
            tax: full.tax,
            discount: full.discount,
            items: [],
            trackingNumber: full.trackingNumber,
            carrier: full.carrier,
          });
          await sendEmail({
            to: full.user.email,
            subject: mail.subject,
            html: mail.html,
            template: "shipping",
          });
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Update tracking error:", error);
    return NextResponse.json(
      { error: "Failed to update tracking" },
      { status: 500 },
    );
  }
}



