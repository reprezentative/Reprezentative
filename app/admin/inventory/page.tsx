import { prisma } from "@/lib/prisma";
import { InventoryRow } from "./InventoryRow";
import { AdminPageHelp } from "@/components/AdminPageHelp";

export default async function AdminInventoryPage() {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          images: true,
        },
      },
    },
    orderBy: [
      { available: "asc" },
      { product: { name: "asc" } },
      { size: "asc" },
    ],
  });

  const totalVariants = variants.length;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Inventory Manager
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              View stock levels across all variants. Color-coded by availability.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {totalVariants} variant{totalVariants === 1 ? "" : "s"}
            </p>
            <AdminPageHelp page="inventory" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-left font-medium">Color</th>
                <th className="px-3 py-2 text-left font-medium">Size</th>
                <th className="px-3 py-2 text-right font-medium">Stock</th>
                <th className="px-3 py-2 text-right font-medium">Reserved</th>
                <th className="px-3 py-2 text-right font-medium">Available</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <InventoryRow
                  key={variant.id}
                  variant={variant}
                />
              ))}
              {variants.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No variants found. Once products and variants are created,
                    they will appear here.
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


