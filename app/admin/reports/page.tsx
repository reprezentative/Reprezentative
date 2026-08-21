import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";

export const dynamic = "force-dynamic";

// Orders that count toward revenue (exclude drafts, cancelled, refunded).
const REVENUE_WHERE = {
  isDraft: false,
  status: { notIn: ["CANCELLED", "REFUNDED"] as any },
};

function money(n: number) {
  return "$" + Number(n || 0).toFixed(2);
}

export default async function ReportsPage() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [agg, agg30, statusGroups, recent, topItems] = await Promise.all([
    prisma.order.aggregate({
      where: REVENUE_WHERE,
      _sum: { total: true, tax: true, discount: true, shipping: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { ...REVENUE_WHERE, createdAt: { gte: since30 } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { isDraft: false },
    }),
    prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: { gte: since30 } },
      select: { total: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["name"],
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
  ]);

  const revenue = agg._sum.total ?? 0;
  const orderCount = agg._count ?? 0;
  const aov = orderCount > 0 ? revenue / orderCount : 0;
  const revenue30 = agg30._sum.total ?? 0;
  const orders30 = agg30._count ?? 0;

  // Bucket the last 14 days by day for a simple bar chart.
  const days: { label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const total = recent
      .filter((o) => o.createdAt.toISOString().slice(0, 10) === key)
      .reduce((s, o) => s + o.total, 0);
    days.push({
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total,
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  const stat = (label: string, value: string, sub?: string) => (
    <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
      <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-[0.7rem] text-neutral-500">{sub}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Revenue, order, and product performance. Drafts, cancellations,
              and refunds are excluded from revenue.
            </p>
          </div>
          <AdminPageHelp page="reports" />
        </div>
      </div>

      <section className="space-y-6 px-6 py-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stat("Total revenue", money(revenue), `${orderCount} orders`)}
          {stat("Avg order value", money(aov))}
          {stat("Revenue (30 days)", money(revenue30), `${orders30} orders`)}
          {stat("Tax collected", money(agg._sum.tax ?? 0))}
        </div>

        {/* Sales by day */}
        <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Revenue — last 14 days
          </h2>
          <div className="flex items-end gap-1.5" style={{ height: 160 }}>
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-sky-500/70"
                  style={{
                    height: `${Math.round((d.total / maxDay) * 130)}px`,
                    minHeight: d.total > 0 ? 3 : 0,
                  }}
                  title={money(d.total)}
                />
                <span className="text-[0.55rem] text-neutral-500">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top products */}
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Top products by units sold
            </h2>
            <div className="space-y-2 text-xs">
              {topItems.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between border-b border-neutral-900 pb-2"
                >
                  <span className="text-neutral-200">{t.name}</span>
                  <span className="text-neutral-400">
                    {t._sum.quantity ?? 0} units
                  </span>
                </div>
              ))}
              {topItems.length === 0 && (
                <p className="text-neutral-500">No sales yet.</p>
              )}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Orders by status
            </h2>
            <div className="space-y-2 text-xs">
              {statusGroups.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between border-b border-neutral-900 pb-2"
                >
                  <span className="text-neutral-200">{s.status}</span>
                  <span className="text-neutral-400">
                    {s._count.status}
                  </span>
                </div>
              ))}
              {statusGroups.length === 0 && (
                <p className="text-neutral-500">No orders yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
