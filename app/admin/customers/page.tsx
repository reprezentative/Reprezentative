import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 20;

type SearchParams = {
  q?: string;
  page?: string;
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = (searchParams.q ?? "").trim();
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);

  const where: any = {
    role: "CUSTOMER",
  };

  if (query) {
    where.OR = [
      { email: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
    ];
  }

  const [totalCount, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  // Aggregate order stats only for the customers on THIS page (not the whole
  // table), and pull first/last order dates in the same query.
  const customerIds = customers.map((c) => c.id);
  const orderStats =
    customerIds.length > 0
      ? await prisma.order.groupBy({
          by: ["userId"],
          where: {
            userId: { in: customerIds },
            status: { notIn: ["CANCELLED", "REFUNDED"] },
          },
          _count: { _all: true },
          _sum: { total: true },
          _min: { createdAt: true },
          _max: { createdAt: true },
        })
      : [];

  const orderMap = new Map<
    string,
    { count: number; total: number; firstOrder: Date | null; lastOrder: Date | null }
  >();
  for (const row of orderStats) {
    orderMap.set(row.userId, {
      count: row._count._all,
      total: row._sum.total ?? 0,
      firstOrder: row._min.createdAt ?? null,
      lastOrder: row._max.createdAt ?? null,
    });
  }

  const makeQuery = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const base: SearchParams = {
      q: searchParams.q,
      page: searchParams.page,
      ...overrides,
    };
    Object.entries(base).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Customers
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              View customers, their spend, and order history at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {totalCount} customer{totalCount === 1 ? "" : "s"}
            </p>
            <AdminPageHelp page="customers" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        {/* Search */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <form className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by email or name"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-neutral-700 px-3 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
            >
              Search
            </button>
          </form>
        </div>

        {/* Customers table */}
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  Customer
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Orders
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Total Spend
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Avg. Order Value
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  First / Last Order
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const stats = orderMap.get(customer.id);
                const orderCount = stats?.count ?? 0;
                const totalSpend = stats?.total ?? 0;
                const aov =
                  orderCount > 0 ? totalSpend / orderCount : 0;

                return (
                  <tr
                    key={customer.id}
                    className="border-t border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/admin/customers/${encodeURIComponent(
                          customer.id,
                        )}`}
                        className="inline-flex flex-col gap-0.5"
                      >
                        <span className="text-xs font-medium text-white">
                          {customer.name ?? "Customer"}
                        </span>
                        <span className="text-[0.7rem] text-neutral-400">
                          {customer.email}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-neutral-200">
                      {orderCount}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      ${totalSpend.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                      {orderCount > 0
                        ? `$${aov.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-[0.7rem] text-neutral-400">
                      {stats?.firstOrder && stats?.lastOrder ? (
                        <div className="flex flex-col gap-0.5">
                          <span>
                            First{" "}
                            {stats.firstOrder.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span>
                            Last{" "}
                            {stats.lastOrder.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-500">
                          Joined{" "}
                          {customer.createdAt.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No customers found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-[0.7rem] text-neutral-400 md:flex-row">
          <p>
            Showing{" "}
            <span className="text-neutral-100">
              {customers.length > 0
                ? (page - 1) * PAGE_SIZE + 1
                : 0}
              –
              {(page - 1) * PAGE_SIZE + customers.length}
            </span>{" "}
            of <span className="text-neutral-100">{totalCount}</span>{" "}
            customers
          </p>

          <Pagination
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => makeQuery({ page: String(p) })}
          />
        </div>
      </section>
    </main>
  );
}


