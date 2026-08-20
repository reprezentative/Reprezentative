import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { id: string };
};

async function getCustomer(id: string) {
  const [user, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
    }),
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) return null;

  // Financial metrics reflect realized orders only (exclude cancelled/refunded);
  // the full order list is still shown below for history.
  const realizedOrders = orders.filter(
    (o) => o.status !== "CANCELLED" && o.status !== "REFUNDED",
  );

  const orderCount = realizedOrders.length;
  const totalSpend = realizedOrders.reduce((sum, o) => sum + o.total, 0);
  const aov = orderCount > 0 ? totalSpend / orderCount : 0;
  const lastOrder = orders[0] ?? null;
  const firstOrder = orders[orders.length - 1] ?? null;

  return {
    user,
    orders,
    stats: {
      orderCount,
      totalSpend,
      aov,
      lastOrder,
      firstOrder,
    },
  };
}

export default async function AdminCustomerDetailPage({
  params,
}: PageProps) {
  const data = await getCustomer(params.id);

  if (!data) {
    notFound();
  }

  const { user, orders, stats } = data;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <Link
                href="/admin/customers"
                className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400 hover:text-white"
              >
                Customers
              </Link>
              <span className="text-neutral-600">/</span>
              <span className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200">
                {user.email}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              {user.name ?? "Customer"}
            </h1>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>

          <div className="text-right text-xs text-neutral-300">
            <p className="font-semibold text-white">
              LTV ${stats.totalSpend.toFixed(2)}
            </p>
            <p className="text-[0.7rem] text-neutral-400">
              {stats.orderCount} order
              {stats.orderCount === 1 ? "" : "s"} • AOV $
              {stats.aov.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-6 px-6 py-6 md:grid-cols-[2fr,1fr]">
        {/* Orders list */}
        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Orders
            </h2>
            <div className="mt-3 space-y-3 text-xs">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 border-b border-neutral-900 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(
                        order.id,
                      )}`}
                      className="text-xs font-medium text-white hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-[0.7rem] text-neutral-400">
                      {order.status} •{" "}
                      {order.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right text-xs text-neutral-200">
                    <p>${order.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-xs text-neutral-500">
                  This customer has not placed any orders yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer stats */}
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-1">
            <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Lifetime Value
              </h2>
              <p className="mt-2 text-2xl font-semibold">
                ${stats.totalSpend.toFixed(2)}
              </p>
              <p className="mt-1 text-[0.7rem] text-neutral-400">
                {stats.orderCount} order
                {stats.orderCount === 1 ? "" : "s"} • AOV $
                {stats.aov.toFixed(2)}
              </p>
            </div>

            <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Activity
              </h2>
              <div className="mt-2 space-y-1 text-[0.7rem] text-neutral-300">
                <p>
                  Joined{" "}
                  {user.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-neutral-400">
                  First order:{" "}
                  <span className="text-neutral-200">
                    {stats.firstOrder
                      ? stats.firstOrder.createdAt.toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : "—"}
                  </span>
                </p>
                <p className="text-neutral-400">
                  Last order:{" "}
                  <span className="text-neutral-200">
                    {stats.lastOrder
                      ? stats.lastOrder.createdAt.toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}



