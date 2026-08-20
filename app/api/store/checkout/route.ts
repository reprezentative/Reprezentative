import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type IncomingItem = { id?: string; size?: string; qty?: number };

function genOrderNumber() {
  return "RPZ-" + String(Math.floor(100000 + Math.random() * 899999));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      firstName,
      lastName,
      address,
      city,
      zip,
      country,
      items,
    } = body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      address?: string;
      city?: string;
      zip?: string;
      country?: string;
      items?: IncomingItem[];
    };

    const cleanEmail = (email ?? "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });
    }

    // Load the referenced products (by slug) with their variants.
    const slugs = [...new Set(items.map((i) => (i.id ?? "").trim()).filter(Boolean))];
    const products = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      include: { variants: { where: { discontinued: false } } },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    // Validate every line and build the order plan (server-side prices/stock).
    type Plan = {
      product: (typeof products)[number];
      size: string;
      qty: number;
      price: number;
      color: string;
      image: string;
      // variantId -> amount to decrement
      decrements: { variantId: string; amount: number }[];
    };
    const plan: Plan[] = [];

    for (const line of items) {
      const slug = (line.id ?? "").trim();
      const size = (line.size ?? "").trim();
      const qty = Math.floor(Number(line.qty) || 0);
      const product = bySlug.get(slug);

      if (!product) {
        return NextResponse.json(
          { error: `An item in your bag is no longer available.` },
          { status: 400 },
        );
      }
      if (!size || qty <= 0) {
        return NextResponse.json(
          { error: `Choose a size for ${product.name}.` },
          { status: 400 },
        );
      }

      const sizeVariants = product.variants
        .filter((v) => v.size.toLowerCase() === size.toLowerCase())
        .sort((a, b) => (b.available ?? b.stock) - (a.available ?? a.stock));

      const totalAvailable = sizeVariants.reduce(
        (sum, v) => sum + Math.max(0, v.available ?? v.stock),
        0,
      );
      if (totalAvailable < qty) {
        return NextResponse.json(
          {
            error: `Only ${totalAvailable} left of ${product.name} (${size}).`,
          },
          { status: 400 },
        );
      }

      // Spread the quantity across matching-size variants (fullest first).
      let remaining = qty;
      const decrements: { variantId: string; amount: number }[] = [];
      for (const v of sizeVariants) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Math.max(0, v.available ?? v.stock));
        if (take > 0) {
          decrements.push({ variantId: v.id, amount: take });
          remaining -= take;
        }
      }

      plan.push({
        product,
        size,
        qty,
        price: product.price,
        color: sizeVariants[0]?.color ?? "",
        image: product.images?.[0] ?? "",
        decrements,
      });
    }

    const subtotal = plan.reduce((sum, l) => sum + l.price * l.qty, 0);
    const shipping = subtotal >= 150 || subtotal === 0 ? 0 : 8;
    const total = subtotal + shipping;

    // Guest checkout: reuse an existing account by email or create one.
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(2) + Date.now().toString(36),
        10,
      );
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          password: randomPassword,
          role: "CUSTOMER",
          name: [firstName, lastName].filter(Boolean).join(" ") || null,
        },
      });
    }
    const userId = user.id;

    // Create the order, line items, and decrement stock atomically. Retry once
    // if the random order number happens to collide.
    let created: { orderNumber: string } | null = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      const orderNumber = genOrderNumber();
      try {
        created = await prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              orderNumber,
              userId,
              status: "PENDING",
              subtotal,
              shipping,
              tax: 0,
              discount: 0,
              total,
            },
          });

          for (const l of plan) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: l.product.id,
                name: l.product.name,
                image: l.image,
                size: l.size,
                color: l.color,
                quantity: l.qty,
                price: l.price,
              },
            });

            for (const d of l.decrements) {
              const variant = await tx.productVariant.findUnique({
                where: { id: d.variantId },
              });
              if (!variant) continue;
              if ((variant.available ?? variant.stock) < d.amount) {
                // Stock changed under us — abort the whole order.
                throw new Error("INSUFFICIENT_STOCK");
              }
              const previousStock = variant.stock;
              const newStock = previousStock - d.amount;
              await tx.productVariant.update({
                where: { id: variant.id },
                data: {
                  stock: newStock,
                  available: newStock - variant.reserved,
                },
              });
              await tx.stockHistory.create({
                data: {
                  variantId: variant.id,
                  delta: -d.amount,
                  previousStock,
                  newStock,
                  reason: "order_created",
                  notes: `Order ${orderNumber}`,
                },
              });
            }
          }

          // Save the shipping address for the customer record (best-effort).
          if (address && city && zip) {
            await tx.address.create({
              data: {
                userId,
                name:
                  [firstName, lastName].filter(Boolean).join(" ") || "Customer",
                street: address,
                city,
                state: "",
                zipCode: zip,
                country: country || "United States",
                phone: "",
                isDefault: false,
              },
            });
          }

          return { orderNumber: order.orderNumber };
        });
      } catch (err: any) {
        if (err?.code === "P2002") {
          continue; // duplicate order number — retry
        }
        if (err?.message === "INSUFFICIENT_STOCK") {
          return NextResponse.json(
            { error: "Sorry — an item just sold out. Please review your bag." },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    if (!created) {
      return NextResponse.json(
        { error: "Could not place the order. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { orderNumber: created.orderNumber, total },
      { status: 201 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Store checkout error:", error);
    }
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 },
    );
  }
}
