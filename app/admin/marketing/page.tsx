import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";

export default async function AdminMarketingPage() {
  // Simple 30-day window for marketing snapshot
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [ordersLast30, subscribersTotal, subscribersLast30] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: last30 },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      select: { total: true, discount: true },
    }),
    prisma.newsletter.count({
      where: { subscribed: true },
    }),
    prisma.newsletter.count({
      where: { subscribed: true, subscribedAt: { gte: last30 } },
    }),
  ]);

  const totalRevenueLast30 = ordersLast30.reduce((sum, o) => sum + o.total, 0);
  const discountedOrdersLast30 = ordersLast30.filter(
    (o) => (o.discount ?? 0) > 0,
  ).length;
  const discountRevenueLast30 = ordersLast30
    .filter((o) => (o.discount ?? 0) > 0)
    .reduce((sum, o) => sum + o.total, 0);

  const discountShare =
    totalRevenueLast30 > 0
      ? (discountRevenueLast30 / totalRevenueLast30) * 100
      : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Marketing Hub
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              High-level view of campaigns, discount performance, and
              newsletter growth.
            </p>
          </div>
          <AdminPageHelp page="marketing" />
        </div>
      </div>

      <section className="space-y-6 px-6 py-6 text-xs">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Revenue (Last 30 Days)
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              ${totalRevenueLast30.toFixed(2)}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              All completed orders in the last 30 days.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Discounted Orders (Last 30 Days)
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {discountedOrdersLast30}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              Orders where a discount was applied.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Revenue from Discounted Orders
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              ${discountRevenueLast30.toFixed(2)}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              {discountShare > 0
                ? `${discountShare.toFixed(
                    1,
                  )}% of last 30 days revenue came from discounted orders.`
                : "No discounted orders in the last 30 days."}
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Newsletter Subscribers
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {subscribersTotal}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              +{subscribersLast30} in the last 30 days.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-dashed border-neutral-800 bg-zinc-950/40 p-4 text-[0.7rem] text-neutral-300">
          <p className="font-semibold text-neutral-100">
            What this page covers today
          </p>
          <p className="mt-1 text-neutral-400">
            This initial Marketing Hub focuses on read-only insights using your
            existing Orders and Newsletter data: revenue mix, discount
            dependency, and subscriber growth. In a future pass, this screen can
            grow into a full campaigns manager (email blasts, coupon
            performance, abandoned cart flows) without breaking this layout.
          </p>
        </div>
      </section>
    </main>
  );
}

