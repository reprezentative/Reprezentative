import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  // Non-discontinued variants at or below their restock threshold.
  const variants = await prisma.productVariant.findMany({
    where: { discontinued: false },
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { available: "asc" },
  });

  const low = variants.filter(
    (v) => (v.available ?? v.stock) <= v.restockThreshold,
  );
  const out = low.filter((v) => (v.available ?? v.stock) <= 0);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Low-stock Alerts
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Variants at or below their restock threshold. Reorder before they
              sell out.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {low.length} low · {out.length} out
            </p>
            <AdminPageHelp page="low-stock" />
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
                <th className="px-3 py-2 text-left font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Available</th>
                <th className="px-3 py-2 text-right font-medium">Threshold</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {low.map((v) => {
                const avail = v.available ?? v.stock;
                return (
                  <tr
                    key={v.id}
                    className="border-t border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/product/${v.product.slug}`}
                        className="text-sky-400 hover:underline"
                      >
                        {v.product.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-300">
                      {v.size} · {v.color}
                    </td>
                    <td className="px-3 py-2 align-top text-[0.7rem] text-neutral-500">
                      {v.sku}
                    </td>
                    <td className="px-3 py-2 align-top text-right font-medium text-neutral-100">
                      {avail}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-neutral-400">
                      {v.restockThreshold}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {avail <= 0 ? (
                        <span className="rounded bg-rose-950 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-rose-300">
                          Out
                        </span>
                      ) : (
                        <span className="rounded bg-amber-950 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-amber-300">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {low.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    All variants are above their restock thresholds. 🎉
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
