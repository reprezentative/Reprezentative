import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";

export const dynamic = "force-dynamic";

export default async function AdminBackInStockPage() {
  const requests = await prisma.backInStockRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      variant: {
        select: {
          size: true,
          color: true,
          stock: true,
          available: true,
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });

  const waiting = requests.filter((r) => !r.notified).length;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Back-in-stock Requests
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Customers waiting for sold-out sizes. Restock the variant, then
              reach out.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">{waiting} waiting</p>
            <AdminPageHelp page="back-in-stock" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-left font-medium">Variant</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Stock now</th>
                <th className="px-3 py-2 text-left font-medium">Requested</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-900 hover:bg-neutral-900/40"
                >
                  <td className="px-3 py-2 align-top">
                    {r.variant?.product?.slug ? (
                      <Link
                        href={`/product/${r.variant.product.slug}`}
                        className="text-sky-400 hover:underline"
                      >
                        {r.variant.product.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-neutral-300">
                    {r.variant?.size}
                    {r.variant?.color ? ` · ${r.variant.color}` : ""}
                  </td>
                  <td className="px-3 py-2 align-top text-neutral-300">
                    <a
                      href={`mailto:${r.email}`}
                      className="text-sky-400 hover:underline"
                    >
                      {r.email}
                    </a>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {r.variant && (r.variant.available ?? r.variant.stock) > 0 ? (
                      <span className="text-emerald-400">
                        {r.variant.available ?? r.variant.stock} available
                      </span>
                    ) : (
                      <span className="text-neutral-500">Out</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-400">
                    {r.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No back-in-stock requests yet.
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
