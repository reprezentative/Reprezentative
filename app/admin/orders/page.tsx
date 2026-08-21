import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 20;

type SearchParams = {
  status?: string;
  q?: string;
  page?: string;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const statusFilter = (searchParams.status ?? "").trim();
  const query = (searchParams.q ?? "").trim();
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);

  const where: any = {};

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (query) {
    where.OR = [
      { orderNumber: { contains: query, mode: "insensitive" } },
      {
        user: {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  const makeQuery = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const base: SearchParams = {
      status: searchParams.status,
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
              Orders
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Review recent orders, update status, and manage fulfillment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {totalCount} order{totalCount === 1 ? "" : "s"}
            </p>
            <Link
              href="/admin/orders/new"
              className="rounded-md bg-white px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-black hover:bg-neutral-200"
            >
              New order
            </Link>
            <a
              href="/api/admin/orders/export"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
            >
              Export CSV
            </a>
            <AdminPageHelp page="orders" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <form className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by order #, customer email, or name"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-neutral-700 px-3 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
            {["", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map(
              (s) => (
                <Link
                  key={s || "ALL"}
                  href={makeQuery({
                    status: s || undefined,
                    page: "1",
                  })}
                  className={`rounded-full border px-2.5 py-1 ${
                    statusFilter === s
                      ? "border-white bg-white text-black"
                      : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  {s || "All statuses"}
                </Link>
              ),
            )}
          </div>
        </div>

        {/* Orders table */}
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
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
                <th className="px-3 py-2 text-left font-medium">
                  Tracking
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
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-neutral-900 hover:bg-neutral-900/40"
                >
                  <td className="px-3 py-2 align-top text-xs text-neutral-100">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(order.id)}`}
                      className="inline-flex flex-col gap-0.5"
                    >
                      <span className="font-medium">
                        {order.orderNumber}
                      </span>
                      <span className="text-[0.7rem] text-neutral-500">
                        {order.id}
                      </span>
                    </Link>
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
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-300">
                    {order.trackingNumber && order.carrier ? (
                      <span>
                        {order.trackingNumber} ({order.carrier})
                      </span>
                    ) : (
                      <span className="text-neutral-500">
                        No tracking
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                    ${order.total.toFixed(2)}
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
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No orders found. Adjust filters or check back after
                    customers place orders.
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
              {orders.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {(page - 1) * PAGE_SIZE + orders.length}
            </span>{" "}
            of <span className="text-neutral-100">{totalCount}</span> orders
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


