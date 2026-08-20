import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewPurchaseOrderForm } from "./NewPurchaseOrderForm";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 20;

type SearchParams = {
  status?: string;
  page?: string;
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const status = (searchParams.status ?? "").trim();
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [totalCount, orders, suppliers] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { name: true, country: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  const makeQuery = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const base: SearchParams = {
      status: searchParams.status,
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
              Purchase Orders
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Manage inbound POs from suppliers and track receiving.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {totalCount} PO{totalCount === 1 ? "" : "s"}
            </p>
            <AdminPageHelp page="operations-purchase-orders" />
          </div>
        </div>
      </div>

      <section className="space-y-6 px-6 py-6">
        <NewPurchaseOrderForm suppliers={suppliers} />

        <div className="flex flex-wrap items-center justify-between gap-3 text-[0.7rem] text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            {["", "DRAFT", "SENT", "CONFIRMED", "IN_PRODUCTION", "SHIPPED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].map(
              (s) => (
                <Link
                  key={s || "ALL"}
                  href={makeQuery({
                    status: s || undefined,
                    page: "1",
                  })}
                  className={`rounded-full border px-2.5 py-1 ${
                    status === s
                      ? "border-white bg-white text-black"
                      : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  {s || "All"}
                </Link>
              ),
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">PO</th>
                <th className="px-3 py-2 text-left font-medium">Supplier</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">
                  Issue / Expected
                </th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr
                  key={po.id}
                  className="border-t border-neutral-900 hover:bg-neutral-900/40"
                >
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/admin/operations/purchase-orders/${encodeURIComponent(
                        po.id,
                      )}`}
                      className="inline-flex flex-col gap-0.5"
                    >
                      <span className="text-xs font-medium text-white">
                        {po.poNumber}
                      </span>
                      <span className="text-[0.7rem] text-neutral-500">
                        {po.id}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-300">
                    <div className="flex flex-col gap-0.5">
                      <span>{po.supplier.name}</span>
                      <span className="text-neutral-500">
                        {po.supplier.country}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-200">
                    {po.status}
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-300">
                    <div className="flex flex-col gap-0.5">
                      <span>
                        Issue:{" "}
                        {po.issueDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-neutral-400">
                        Expected:{" "}
                        {po.expectedDate
                          ? po.expectedDate.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                    ${po.total.toFixed(2)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No purchase orders yet. Use the form above to create your
                    first PO.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-[0.7rem] text-neutral-400 md:flex-row">
          <p>
            Showing{" "}
            <span className="text-neutral-100">
              {orders.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {(page - 1) * PAGE_SIZE + orders.length}
            </span>{" "}
            of <span className="text-neutral-100">{totalCount}</span> POs
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


