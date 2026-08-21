import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

function genOrderNumber() {
  return "RPZ-" + String(Math.floor(100000 + Math.random() * 899999));
}

// Admin-created (manual/phone) order. Draft orders don't touch inventory.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const email = (body?.email ?? "").trim().toLowerCase();
    const items = Array.isArray(body?.items) ? body.items : [];
    const isDraft = !!body?.isDraft;
    const notes = body?.notes ? String(body.notes) : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid customer email is required" }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "Add at least one line item" }, { status: 400 });
    }

    // Resolve products + variants.
    const slugs: string[] = Array.from(
      new Set(
        (items as any[])
          .map((i): string => String(i?.id ?? "").trim())
          .filter((s): s is string => s.length > 0),
      ),
    );
    const products = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      include: { variants: true },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    const plan: any[] = [];
    for (const line of items) {
      const product = bySlug.get((line.id ?? "").trim());
      const size = (line.size ?? "").trim();
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      if (!product) {
        return NextResponse.json({ error: `Unknown product: ${line.id}` }, { status: 400 });
      }
      const sizeVariants = product.variants
        .filter((v) => v.size.toLowerCase() === size.toLowerCase())
        .sort((a, b) => (b.available ?? b.stock) - (a.available ?? a.stock));
      plan.push({
        product,
        size: size || sizeVariants[0]?.size || "One Size",
        qty,
        price: product.price,
        color: sizeVariants[0]?.color ?? "Default",
        image: product.images?.[0] ?? "",
        variantId: sizeVariants[0]?.id ?? null,
      });
    }

    const subtotal = plan.reduce((s, l) => s + l.price * l.qty, 0);
    const discount = Math.max(0, Number(body?.discount) || 0);
    const shipping =
      body?.shipping != null && body.shipping !== ""
        ? Number(body.shipping) || 0
        : subtotal >= 150 || subtotal === 0
          ? 0
          : 8;
    const total = Math.max(0, subtotal - discount + shipping);

    // Find/create the customer.
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const pw = await bcrypt.hash(Math.random().toString(36).slice(2), 10);
      user = await prisma.user.create({
        data: { email, password: pw, role: "CUSTOMER", name: body?.name || null },
      });
    }

    let orderNumber = genOrderNumber();
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user!.id,
          status: "PENDING",
          isDraft,
          notes,
          subtotal,
          shipping,
          tax: 0,
          discount,
          total,
        },
      });
      for (const l of plan) {
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: l.product.id,
            name: l.product.name,
            image: l.image,
            size: l.size,
            color: l.color,
            quantity: l.qty,
            price: l.price,
          },
        });
        // Only decrement stock for real (non-draft) orders.
        if (!isDraft && l.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: l.variantId } });
          if (variant) {
            const newStock = Math.max(0, variant.stock - l.qty);
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: newStock, available: newStock - variant.reserved },
            });
            await tx.stockHistory.create({
              data: {
                variantId: variant.id,
                delta: -(variant.stock - newStock),
                previousStock: variant.stock,
                newStock,
                reason: "manual_order",
                notes: `Order ${orderNumber}`,
                userId: auth.userId ?? null,
              },
            });
          }
        }
      }
      return created;
    });

    await logAudit({
      action: isDraft ? "order.draft_create" : "order.manual_create",
      entity: "Order",
      entityId: order.id,
      userId: auth.userId,
      userEmail: auth.email,
      meta: { orderNumber: order.orderNumber, total, items: plan.length },
    });

    return NextResponse.json({ id: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Manual order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
