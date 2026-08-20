import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { formatCurrency, formatNumber } from "@/lib/format";

type SearchParams = {
  range?: string;
};

function getRangeDates(range: string | undefined) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (range) {
    case "30d": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 29);
      return { from, to: now, label: "Last 30 days" };
    }
    case "ytd": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now, label: "Year to date" };
    }
    default:
      return { from: undefined, to: undefined, label: "All time" };
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from, to, label } = getRangeDates(searchParams.range);

  const orderWhere: any = {
    // Revenue should reflect realized sales only — exclude cancelled/refunded.
    status: { notIn: ["CANCELLED", "REFUNDED"] },
  };
  if (from && to) {
    orderWhere.createdAt = { gte: from, lte: to };
  }

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
    }),
  ]);

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? revenue / orderCount : 0;

  const customerIds = new Set(orders.map((o) => o.userId));
  const activeCustomers = customerIds.size;

  const trendMap = new Map<
    string,
    { date: Date; revenue: number; orders: number }
  >();
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const existing = trendMap.get(key);
    if (existing) {
      existing.revenue += order.total;
      existing.orders += 1;
    } else {
      trendMap.set(key, {
        date: order.createdAt,
        revenue: order.total,
        orders: 1,
      });
    }
  }

  const trend = Array.from(trendMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Analytics
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Core sales and customer metrics with an overview of trends.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[0.7rem] text-neutral-300">
            <span className="rounded-full border border-neutral-700 bg-black px-2 py-1">
              <span className="text-neutral-400">Range:</span>{" "}
              <span className="text-neutral-100">{label}</span>
            </span>
            <AdminPageHelp page="analytics" />
          </div>
        </div>
      </div>

      <section className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md bg-gradient-to-br from-sky-500 to-sky-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Revenue
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(revenue)}
            </p>
          </div>
          <div className="rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Orders
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(orderCount)}
            </p>
          </div>
          <div className="rounded-md bg-gradient-to-br from-purple-500 to-purple-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Avg. Order Value
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(aov)}
            </p>
          </div>
          <div className="rounded-md bg-gradient-to-br from-amber-500 to-amber-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Active Customers
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(activeCustomers)}
            </p>
              <p className="mt-1 text-[0.7rem] opacity-90">
              Total customers: {formatNumber(customers.length)}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Revenue Trend
          </h2>
          <div className="space-y-2 text-[0.75rem] text-neutral-300">
            {trend.length === 0 && (
              <p className="py-4 text-center text-[0.7rem] text-neutral-500">
                No order data in this range.
              </p>
            )}
            {trend.map((row) => (
              <div
                key={row.date.toISOString()}
                className="flex items-center gap-2"
              >
                <span className="w-20 text-neutral-400">
                  {row.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-900">
                    <div
                      className="h-full rounded-full bg-emerald-500/80"
                      style={{
                        width:
                          revenue > 0
                            ? `${Math.max(
                                4,
                                (row.revenue / revenue) * 100,
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
                <span className="w-24 text-right font-mono">
                  {formatCurrency(row.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}


