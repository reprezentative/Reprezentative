import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { ReturnStatusSelect } from "./ReturnStatusSelect";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const returns = await prisma.return.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Returns</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Manage RMAs, restocks, and refunds. Create returns from an order&apos;s
              detail page.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {returns.length} return{returns.length === 1 ? "" : "s"}
            </p>
            <AdminPageHelp page="returns" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Order</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Units</th>
                <th className="px-3 py-2 text-left font-medium">Refund</th>
                <th className="px-3 py-2 text-left font-medium">Reason</th>
                <th className="px-3 py-2 text-left font-medium">Requested</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => {
                const items = Array.isArray(r.items) ? (r.items as any[]) : [];
                const units = items.reduce(
                  (s, x) => s + (Number(x.quantity) || 0),
                  0,
                );
                return (
                  <tr
                    key={r.id}
                    className="border-t border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/admin/orders/${r.order.id}`}
                        className="font-medium text-sky-400 hover:underline"
                      >
                        {r.order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-300">
                      <div className="flex flex-col gap-0.5">
                        <span>{r.order.user?.name ?? "Customer"}</span>
                        <span className="text-neutral-500">
                          {r.order.user?.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {units}
                      {r.restock && (
                        <span className="ml-1 text-[0.65rem] text-emerald-400">
                          restocked
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {r.refundAmount ? `$${r.refundAmount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                      {r.reason ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                      {r.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ReturnStatusSelect id={r.id} status={r.status} />
                    </td>
                  </tr>
                );
              })}
              {returns.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No returns yet. Create one from an order&apos;s detail page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
