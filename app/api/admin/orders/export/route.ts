import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exports all orders as a CSV download.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, name: true } },
      items: true,
    },
  });

  const headers = [
    "Order",
    "Date",
    "Status",
    "Customer",
    "Email",
    "Items",
    "Subtotal",
    "Discount",
    "Shipping",
    "Tax",
    "Total",
    "Coupon",
    "Tracking",
    "Carrier",
    "Draft",
  ];

  const lines = [headers.join(",")];
  for (const o of orders) {
    const itemsSummary = o.items
      .map((i) => `${i.name} ${i.size} x${i.quantity}`)
      .join("; ");
    lines.push(
      [
        o.orderNumber,
        o.createdAt.toISOString().slice(0, 10),
        o.status,
        o.user?.name ?? "",
        o.user?.email ?? "",
        itemsSummary,
        o.subtotal.toFixed(2),
        o.discount.toFixed(2),
        o.shipping.toFixed(2),
        o.tax.toFixed(2),
        o.total.toFixed(2),
        o.couponCode ?? "",
        o.trackingNumber ?? "",
        o.carrier ?? "",
        o.isDraft ? "yes" : "no",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
