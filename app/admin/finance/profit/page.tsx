import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { formatCurrency, formatNumber } from "@/lib/format";

type ProductProfitRow = {
  productId: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cogsTotal: number;
  profit: number;
  margin: number;
};

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

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from, to, label } = getRangeDates(searchParams.range);

  const orderWhere: any = {
    status: { notIn: ["CANCELLED", "REFUNDED"] },
  };
  if (from && to) {
    orderWhere.createdAt = { gte: from, lte: to };
  }

  const expenseWhere: any = {};
  if (from && to) {
    expenseWhere.date = { gte: from, lte: to };
  }

  // Revenue from non-cancelled orders
  const revenueAgg = await prisma.order.aggregate({
    _sum: { total: true },
    where: orderWhere,
  });
  const totalRevenue = revenueAgg._sum.total ?? 0;

  // All COGS entries with product
  const cogsEntries = await prisma.productCOGS.findMany({
    include: {
      product: {
        select: { id: true, name: true, category: true },
      },
    },
    orderBy: { effectiveDate: "desc" },
  });

  // Latest COGS per product
  const latestCogsPerProduct = new Map<
    string,
    { perUnit: number; name: string; category: string }
  >();
  for (const entry of cogsEntries) {
    if (latestCogsPerProduct.has(entry.productId)) continue;
    latestCogsPerProduct.set(entry.productId, {
      perUnit: entry.totalCOGS,
      name: entry.product.name,
      category: entry.product.category,
    });
  }

  // Total expenses
  const expensesAgg = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: expenseWhere,
  });
  const totalExpenses = expensesAgg._sum.amount ?? 0;

  // Profitability by product: derive from order items + latest COGS per unit
  const orderItems = await prisma.orderItem.findMany({
    include: {
      order: {
        select: { status: true, createdAt: true },
      },
      product: {
        select: { id: true, name: true, category: true },
      },
    },
  });

  const productMap = new Map<string, ProductProfitRow>();

  for (const item of orderItems) {
    if (item.order.status === "CANCELLED" || item.order.status === "REFUNDED") {
      continue;
    }
    if (from && to) {
      if (item.order.createdAt < from || item.order.createdAt > to) {
        continue;
      }
    }

    const existing = productMap.get(item.productId);
    const lineRevenue = item.price * item.quantity;
    const cogsInfo = latestCogsPerProduct.get(item.productId);
    const cogsPerUnit = cogsInfo?.perUnit ?? 0;
    const lineCogs = cogsPerUnit * item.quantity;

    if (!existing) {
      const profit = lineRevenue - lineCogs;
      const margin = lineRevenue > 0 ? (profit / lineRevenue) * 100 : 0;
      productMap.set(item.productId, {
        productId: item.productId,
        name: item.product.name,
        category: item.product.category,
        unitsSold: item.quantity,
        revenue: lineRevenue,
        cogsTotal: lineCogs,
        profit,
        margin,
      });
    } else {
      existing.unitsSold += item.quantity;
      existing.revenue += lineRevenue;
      existing.cogsTotal += lineCogs;
      existing.profit = existing.revenue - existing.cogsTotal;
      existing.margin =
        existing.revenue > 0
          ? (existing.profit / existing.revenue) * 100
          : 0;
    }
  }

  const productRows = Array.from(productMap.values()).sort(
    (a, b) => b.profit - a.profit,
  );

  // Company COGS = actual cost of goods SOLD (unit COGS × units sold), summed
  // from the per-product rows so the P&L reconciles with the table below.
  const totalCOGS = productRows.reduce((sum, row) => sum + row.cogsTotal, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  const grossMargin =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Profit &amp; Loss
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Auto-generated P&amp;L with revenue, COGS, expenses, and margins.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[0.7rem] text-neutral-300">
            <div className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-black px-2 py-1">
              <span className="text-neutral-400">Range:</span>
              <span className="text-neutral-100">{label}</span>
            </div>
            <AdminPageHelp page="finance-profit" />
          </div>
        </div>
      </div>

      <section className="space-y-6 px-6 py-6">
        {/* P&L summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md bg-gradient-to-br from-sky-500 to-sky-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Revenue
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-md bg-gradient-to-br from-rose-500 to-rose-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Cost of Goods Sold
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalCOGS)}
            </p>
          </div>
          <div className="rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Gross Profit
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(grossProfit)}
            </p>
            <p className="mt-1 text-[0.7rem] opacity-90">
              {grossMargin.toFixed(1)}% margin
            </p>
          </div>
          <div className="rounded-md bg-gradient-to-br from-purple-500 to-purple-600 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em]">
              Net Profit
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(netProfit)}
            </p>
            <p className="mt-1 text-[0.7rem] opacity-90">
              {netMargin.toFixed(1)}% margin • Expenses{" "}
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>

        {/* P&L line items */}
        <div className="space-y-2 rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Profit &amp; Loss Statement (Summary)
          </h2>
          <div className="mt-2 space-y-1 font-mono text-[0.75rem]">
            <div className="flex justify-between">
              <span>Revenue</span>
              <span>{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-red-300">
              <span>Less: Cost of Goods Sold</span>
              <span>({formatCurrency(totalCOGS)})</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-1 text-emerald-300">
              <span>Gross Profit</span>
              <span>{formatCurrency(grossProfit)}</span>
            </div>
            <div className="flex justify-between text-red-300">
              <span>Less: Operating Expenses</span>
              <span>({formatCurrency(totalExpenses)})</span>
            </div>
            <div className="flex justify-between text-purple-300">
              <span>Net Profit</span>
              <span>{formatCurrency(netProfit)}</span>
            </div>
          </div>
        </div>

        {/* Profitability by product */}
        <div className="space-y-3 rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Profitability by Product
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Units Sold
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">COGS</th>
                  <th className="px-3 py-2 text-right font-medium">Profit</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr
                    key={row.productId}
                    className="border-t border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="px-3 py-2 align-top text-xs text-neutral-100">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-neutral-300">
                      {row.category}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      {formatNumber(row.unitsSold)}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      {formatCurrency(row.cogsTotal)}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-emerald-300">
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      {row.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {productRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-xs text-neutral-500"
                    >
                      No order data available yet for product-level
                      profitability.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}


