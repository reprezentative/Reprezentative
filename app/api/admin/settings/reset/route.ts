import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "System reset is disabled in production" },
      { status: 403 },
    );
  }

  // This endpoint is already blocked in production above. In development / QA
  // we intentionally allow reset regardless of session, since it is a local
  // tool guarded by NODE_ENV.
  const session = await getServerSession(authOptions);

  try {
    await prisma.$transaction(async (tx) => {
      // Clear volatile / test data
      await tx.cartItem.deleteMany({});
      await tx.orderItem.deleteMany({});
      await tx.order.deleteMany({});
      await tx.stockHistory.deleteMany({});
      await tx.purchaseOrderItem.deleteMany({});
      await tx.purchaseOrder.deleteMany({});
      await tx.expense.deleteMany({});
      await tx.productCOGS.deleteMany({});
      await tx.newsletter.deleteMany({});
      await tx.aIChatMessage.deleteMany({});
      await tx.aIChatSession?.deleteMany?.({}).catch(() => {});
      await tx.apiCall?.deleteMany?.({}).catch(() => {});

      // Leave users, products, variants, and content intact.
      // Light demo data to keep dashboards interesting after reset.

      const adminUser =
        (session?.user && ((session.user as any).id as string)) || undefined;

      const now = new Date();

      // Ensure we have a basic product catalog for demo purposes.
      const existingProductCount = await tx.product.count();
      let products = await tx.product.findMany({
        orderBy: { createdAt: "asc" },
      });

      if (existingProductCount === 0) {
        const demoProducts = [
          {
            name: "Heritage Heavyweight Hoodie",
            slug: "heritage-heavyweight-hoodie",
            description:
              "Ultra-heavyweight fleece hoodie with a structured hood and oversized fit.",
            price: 120,
            compareAtPrice: 150,
            sku: "RZ-HOODIE-HERITAGE",
            material: "460GSM cotton fleece",
            fit: "OVERSIZED" as const,
            category: "Hoodies",
            images: [
              "https://images.reprezentative.local/demo/hoodie-1.jpg",
            ],
            colors: [
              { name: "Black", hex: "#000000", available: true },
              { name: "Stone", hex: "#d0c8bc", available: true },
            ],
            sizes: [
              { name: "S", available: true },
              { name: "M", available: true },
              { name: "L", available: true },
              { name: "XL", available: true },
            ],
          },
          {
            name: "Studio Overshirt",
            slug: "studio-overshirt",
            description:
              "Structured twill overshirt designed to layer over tees and hoodies.",
            price: 160,
            compareAtPrice: 0,
            sku: "RZ-OVERSHIRT-STUDIO",
            material: "Heavy cotton twill",
            fit: "REGULAR" as const,
            category: "Outerwear",
            images: [
              "https://images.reprezentative.local/demo/overshirt-1.jpg",
            ],
            colors: [{ name: "Charcoal", hex: "#333333", available: true }],
            sizes: [
              { name: "S", available: true },
              { name: "M", available: true },
              { name: "L", available: true },
            ],
          },
          {
            name: "Everyday Heavy Tee",
            slug: "everyday-heavy-tee",
            description:
              "Boxy heavy tee with a dropped shoulder and reinforced collar.",
            price: 60,
            compareAtPrice: 0,
            sku: "RZ-TEE-EVERYDAY",
            material: "260GSM cotton jersey",
            fit: "RELAXED" as any,
            category: "T-Shirts",
            images: ["https://images.reprezentative.local/demo/tee-1.jpg"],
            colors: [
              { name: "Faded Black", hex: "#111111", available: true },
              { name: "Bone", hex: "#f4f0e8", available: true },
            ],
            sizes: [
              { name: "S", available: true },
              { name: "M", available: true },
              { name: "L", available: true },
              { name: "XL", available: true },
            ],
          },
        ];

        for (const p of demoProducts) {
          const product = await tx.product.create({
            data: {
              name: p.name,
              slug: p.slug,
              description: p.description,
              price: p.price,
              compareAtPrice: p.compareAtPrice || null,
              sku: p.sku,
              material: p.material,
              fit: "OVERSIZED",
              category: p.category,
              images: p.images,
              colors: p.colors as any,
              sizes: p.sizes as any,
              featured: true,
              isNew: true,
              inStock: true,
            },
          });

          // Basic variants: Black / Stone, S–XL
          const variantRows: {
            color: string;
            colorHex: string;
            size: string;
            stock: number;
            sku: string;
          }[] = [];
          for (const color of p.colors) {
            for (const size of p.sizes) {
              variantRows.push({
                color: color.name,
                colorHex: color.hex,
                size: size.name,
                stock: 20,
                sku: `${p.sku}-${color.name.toUpperCase()}-${size.name}`,
              });
            }
          }

          for (const v of variantRows) {
            await tx.productVariant.create({
              data: {
                productId: product.id,
                color: v.color,
                colorHex: v.colorHex,
                size: v.size,
                stock: v.stock,
                reserved: 0,
                available: v.stock,
                restockThreshold: 5,
                sku: v.sku,
                discontinued: false,
              },
            });
          }

          // Simple COGS row
          await tx.productCOGS.create({
            data: {
              productId: product.id,
              fabricCost: 12,
              fabricYards: 2,
              trimsCost: 3,
              packagingCost: 2,
              laborCost: 8,
              patternCost: 2,
              gradingCost: 1.5,
              sampleCost: 3,
              printingCost: 0,
              qcCost: 1,
              freightCost: 4,
              dutiesCost: 3,
              brokerageCost: 1,
              domesticShipping: 2,
              warehousingCost: 1.5,
              handlingCost: 1,
              shrinkageRate: 0.02,
              totalCOGS: 41,
              effectiveDate: now,
              notes: "Demo COGS entry for dashboard views.",
            },
          });
        }

        products = await tx.product.findMany({
          orderBy: { createdAt: "asc" },
        });
      }

      // Ensure we have a couple of demo customers.
      const existingCustomers = await tx.user.findMany({
        where: { role: "CUSTOMER" },
        take: 2,
      });

      const customers =
        existingCustomers.length > 0
          ? existingCustomers
          : await tx.user.createMany({
              data: [
                {
                  email: "first.customer@example.com",
                  password: "demo",
                  role: "CUSTOMER",
                  name: "First Customer",
                },
                {
                  email: "second.customer@example.com",
                  password: "demo",
                  role: "CUSTOMER",
                  name: "Second Customer",
                },
              ],
              skipDuplicates: true,
            }).then(async () =>
              tx.user.findMany({
                where: { role: "CUSTOMER" },
                take: 2,
              }),
            );

      const primaryCustomer = customers[0];

      // Seed a realistic mini-order history if we have a customer and products.
      if (primaryCustomer && products.length > 0) {
        for (let i = 0; i < 8; i++) {
          const daysAgo = 7 * i;
          const createdAt = new Date(
            now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
          );
          const product = products[i % products.length];
          const quantity = i % 3 === 0 ? 2 : 1;
          const subtotal = product.price * quantity;
          const shipping = subtotal > 150 ? 0 : 10;
          const tax = Math.round(subtotal * 0.08 * 100) / 100;
          const total = subtotal + shipping + tax;

          const order = await tx.order.create({
            data: {
              orderNumber: `RZ-${Math.floor(1000 + Math.random() * 9000)}`,
              userId: primaryCustomer.id,
              status: "DELIVERED",
              subtotal,
              shipping,
              tax,
              discount: 0,
              total,
              createdAt,
              updatedAt: createdAt,
              trackingNumber: i < 5 ? `1ZDEMO${1000 + i}` : null,
              carrier: i < 5 ? "UPS" : null,
              shippedAt: i < 5 ? createdAt : null,
              deliveredAt: i < 5 ? new Date(createdAt.getTime() + 3 * 86400000) : null,
            },
          });

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              name: product.name,
              image: product.images[0] ?? "",
              size: "L",
              color: "Black",
              quantity,
              price: product.price,
            },
          });
        }
      }

      // Seed a couple of expenses for finance views if we have at least one user.
      const anyUser = await tx.user.findFirst({});
      if (adminUser || anyUser) {
        const creatorId = adminUser ?? anyUser!.id;

        const months = [2, 1, 0];
        const expenseRows: any[] = [];

        for (const offset of months) {
          const date = new Date(
            now.getFullYear(),
            now.getMonth() - offset,
            15,
          );
          expenseRows.push(
            {
              category: "MARKETING",
              subcategory: "PAID_SOCIAL",
              description: "Meta + TikTok campaigns",
              amount: 2000 + offset * 250,
              date,
              vendor: "Meta / TikTok",
              isRecurring: true,
              frequency: "MONTHLY",
              receiptUrl: null,
              notes: "Core acquisition campaigns",
              createdBy: creatorId,
            },
            {
              category: "PLATFORM",
              subcategory: "SAAS",
              description: "E‑commerce platform & tools",
              amount: 600,
              date,
              vendor: "SaaS Stack",
              isRecurring: true,
              frequency: "MONTHLY",
              receiptUrl: null,
              notes: "Infra + tooling",
              createdBy: creatorId,
            },
          );
        }

        await tx.expense.createMany({ data: expenseRows });
      }

      // Seed a simple newsletter list
      await tx.newsletter.createMany({
        data: [
          {
            email: "demo.customer+1@example.com",
            subscribed: true,
            subscribedAt: now,
          },
          {
            email: "demo.customer+2@example.com",
            subscribed: true,
            subscribedAt: now,
          },
        ],
        skipDuplicates: true,
      });
    });

    return NextResponse.json(
      { status: "ok", message: "System reset to a clean demo state." },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("System reset error:", error);
    }
    return NextResponse.json(
      { error: "Failed to run system reset" },
      { status: 500 },
    );
  }
}


