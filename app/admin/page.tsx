import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { formatCurrency, formatNumber } from "@/lib/format";

type KPIRow = {
  label: string;
  value: string;
  sublabel?: string;
};

type ChecklistItem = {
  label: string;
  done: boolean;
  description?: string;
};

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  const endOfYesterday = new Date(startOfToday);
  endOfYesterday.setMilliseconds(-1);

  const last7Days = new Date(startOfToday);
  last7Days.setDate(startOfToday.getDate() - 6);

  const last30Days = new Date(startOfToday);
  last30Days.setDate(startOfToday.getDate() - 29);

  const [
    revenueTodayAgg,
    revenueYesterdayAgg,
    revenueLast7Agg,
    revenueLast30Agg,
    ordersTodayCount,
    ordersLast7Count,
    ordersLast30Count,
    customersTotal,
    customersNew7,
    customersNew30,
    revenueTrendRaw,
    topProducts,
    recentOrders,
    openOrdersByStatus,
    repeatStats,
    productCount,
    orderCountAll,
    stripeKey,
    deepseekKey,
    settingsRow,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: {
          gte: startOfToday,
          lte: now,
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: {
          gte: startOfYesterday,
          lte: endOfYesterday,
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: {
          gte: last7Days,
          lte: now,
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: {
          gte: last30Days,
          lte: now,
        },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: startOfToday, lte: now },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: last7Days, lte: now },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: last30Days, lte: now },
      },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: { gte: last7Days, lte: now },
      },
    }),
    prisma.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: { gte: last30Days, lte: now },
      },
    }),
    prisma.order.groupBy({
      by: ["createdAt"],
      _sum: { total: true },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: {
          gte: last7Days,
          lte: now,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, price: true },
      where: {
        order: {
          status: { notIn: ["CANCELLED", "REFUNDED"] },
          createdAt: {
            gte: last30Days,
            lte: now,
          },
        },
      },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: {
        status: { in: ["PENDING", "PROCESSING", "SHIPPED"] },
      },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: {
        createdAt: {
          gte: last30Days,
          lte: now,
        },
      },
    }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.integrationSecret.findUnique({
      where: { service: "stripe" },
      select: { id: true },
    }),
    prisma.integrationSecret.findUnique({
      where: { service: "deepseek" },
      select: { id: true },
    }),
    prisma.setting.findUnique({
      where: { key: "general" },
      select: { value: true },
    }),
  ]);

  // Resolve product names for the Top Products list (groupBy only returns IDs).
  const topProductNames = await prisma.product.findMany({
    where: { id: { in: topProducts.map((row) => row.productId) } },
    select: { id: true, name: true },
  });
  const productNameById = new Map(
    topProductNames.map((p) => [p.id, p.name]),
  );

  const totalRevenueToday = revenueTodayAgg._sum.total ?? 0;
  const totalRevenueYesterday = revenueYesterdayAgg._sum.total ?? 0;
  const totalRevenueLast7 = revenueLast7Agg._sum.total ?? 0;
  const totalRevenueLast30 = revenueLast30Agg._sum.total ?? 0;

  const revenueChangeVsYesterday =
    totalRevenueYesterday > 0
      ? ((totalRevenueToday - totalRevenueYesterday) / totalRevenueYesterday) *
        100
      : null;

  const kpis: KPIRow[] = [
    {
      label: "Revenue (Last 30 days)",
      value: formatCurrency(totalRevenueLast30),
      sublabel: `Last 7 days: ${formatCurrency(totalRevenueLast7)}`,
    },
    {
      label: "Orders (Last 30 days)",
      value: ordersLast30Count.toString(),
      sublabel: `Today: ${ordersTodayCount} • Last 7 days: ${ordersLast7Count}`,
    },
    {
      label: "Customers",
      value: customersTotal.toString(),
      sublabel: `New (7d): ${customersNew7} • New (30d): ${customersNew30}`,
    },
  ];

  const openOrdersTotal = openOrdersByStatus.reduce(
    (sum, row) => sum + row._count._all,
    0,
  );
  const unshippedCount = openOrdersByStatus
    .filter((row) => row.status !== "DELIVERED")
    .reduce((sum, row) => sum + row._count._all, 0);

  const repeatCustomers = repeatStats.filter((row) => row._count._all >= 2)
    .length;
  const customersWithOrders = repeatStats.length;
  const repeatRate =
    customersWithOrders > 0
      ? (repeatCustomers / customersWithOrders) * 100
      : 0;

  const generalSettings = (settingsRow?.value as any) ?? null;
  const hasStoreName =
    !!generalSettings && typeof generalSettings.storeName === "string";

  const checklist: ChecklistItem[] = [
    {
      label: "Add products",
      done: productCount > 0,
      description: "Create at least one product in the catalog.",
    },
    {
      label: "Configure branding",
      done: hasStoreName,
      description: "Set store name and basics under System Settings.",
    },
    {
      label: "Connect DeepSeek API key",
      done: !!deepseekKey,
      description: "Enable AI Assistant and AI Pricing Engine.",
    },
    {
      label: "Place a test order",
      done: orderCountAll > 0,
      description: "Run through checkout with a test card.",
    },
    {
      label: "Connect Stripe (optional)",
      done: !!stripeKey,
      description: "Use dashboard-managed key or env var for live payments.",
    },
  ];

  const revenueTrend = (() => {
    const trend: { label: string; value: number }[] = [];
    const cursor = new Date(last7Days);

    while (cursor <= now) {
      const dayStart = new Date(cursor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setMilliseconds(-1);

      const totalForDay =
        revenueTrendRaw
          .filter(
            (row) =>
              row.createdAt >= dayStart && row.createdAt <= dayEnd,
          )
          .reduce((sum, row) => sum + (row._sum.total ?? 0), 0) ?? 0;

      trend.push({
        label: formatDateLabel(dayStart),
        value: totalForDay,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return trend;
  })();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              High-level overview of sales, customers, and orders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {revenueChangeVsYesterday !== null && (
              <p className="text-[0.7rem] text-neutral-400">
                Today vs yesterday:{" "}
                <span
                  className={
                    revenueChangeVsYesterday >= 0
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }
                >
                  {revenueChangeVsYesterday >= 0 ? "+" : ""}
                  {revenueChangeVsYesterday.toFixed(1)}%
                </span>
              </p>
            )}
            <AdminPageHelp page="dashboard" />
          </div>
        </div>
      </div>

      <section className="space-y-6 px-6 py-6">
        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-md border border-neutral-800 bg-zinc-950/70 p-4"
            >
              <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                {kpi.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
              {kpi.sublabel && (
                <p className="mt-1 text-[0.7rem] text-neutral-500">
                  {kpi.sublabel}
                </p>
              )}
            </div>
          ))}

          <div className="rounded-md border border-neutral-800 bg-zinc-950/70 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Open Orders
            </p>
            <p className="mt-2 text-2xl font-semibold">{openOrdersTotal}</p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              Unshipped: {unshippedCount} • Repeat rate (30d):{" "}
              {repeatRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Revenue trend + top products */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/70 p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Revenue – Last 7 Days
              </h2>
            </div>
            <div className="space-y-2 text-[0.7rem] text-neutral-300">
              {revenueTrend.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-2"
                >
                  <span className="w-14 text-neutral-400">
                    {row.label}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-900">
                      <div
                        className="h-full rounded-full bg-emerald-500/70"
                        style={{
                          width:
                            row.value === 0
                              ? "0%"
                              : `${Math.min(
                                  100,
                                  (row.value / (totalRevenueLast7 || 1)) *
                                    100,
                                )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-20 text-right font-mono">
                    {formatCurrency(row.value)}
                  </span>
                </div>
              ))}
              {revenueTrend.length === 0 && (
                <p className="text-neutral-500">
                  No revenue data for the last 7 days.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Top Products (30d)
              </h2>
            </div>
            <div className="space-y-2 text-[0.7rem] text-neutral-300">
              {topProducts.length === 0 && (
                <p className="text-neutral-500">
                  No product sales in the last 30 days.
                </p>
              )}
              {topProducts.length > 0 && (
                <ul className="space-y-1">
                  {topProducts.map((row) => (
                    <li
                      key={row.productId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-neutral-100">
                        {productNameById.get(row.productId) ?? row.productId}
                      </span>
                      <span className="flex items-center gap-2 font-mono">
                        <span className="text-neutral-400">
                          ×{row._sum.quantity ?? 0}
                        </span>
                        <span>
                          {formatCurrency(
                            (row._sum.price ?? 0) * (row._sum.quantity ?? 0),
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Recent orders + Getting Started */}
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Recent Orders
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    Order
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Total
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Placed
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="px-3 py-2 align-top text-xs text-neutral-100">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-300">
                      <div className="flex flex-col gap-0.5">
                        <span>{order.user?.name ?? "Customer"}</span>
                        <span className="text-neutral-500">
                          {order.user?.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-200">
                      {order.status}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-[0.7rem] text-neutral-400">
                      {order.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-xs text-neutral-500"
                    >
                      No orders have been placed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>

          <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Getting Started
              </h2>
            </div>
            <div className="mt-2 space-y-2 text-[0.75rem]">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2 text-neutral-200"
                >
                  <span
                    className={`mt-[2px] inline-flex h-4 w-4 items-center justify-center rounded-full border text-[0.6rem] ${
                      item.done
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-neutral-600 bg-neutral-900 text-neutral-400"
                    }`}
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <div>
                    <p className="text-[0.75rem]">{item.label}</p>
                    {item.description && (
                      <p className="text-[0.7rem] text-neutral-500">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


