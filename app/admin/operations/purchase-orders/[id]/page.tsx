import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { POStatusForm } from "./POStatusForm";
import { ReceiveItemForm } from "./ReceiveItemForm";
import { AddPOItemForm } from "./AddPOItemForm";

type PageProps = {
  params: { id: string };
};

export default async function PurchaseOrderDetailPage({
  params,
}: PageProps) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      supplier: {
        select: { name: true, country: true },
      },
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: { name: true, sku: true, category: true },
              },
            },
          },
        },
      },
    },
  });

  if (!po) {
    notFound();
  }

  // Variant options for adding line items (product + color/size + SKU).
  const variantRows = await prisma.productVariant.findMany({
    where: { discontinued: false },
    include: { product: { select: { name: true } } },
    orderBy: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }],
    take: 500,
  });
  const variantOptions = variantRows.map((v) => ({
    id: v.id,
    label: `${v.product.name} — ${v.color}/${v.size} (${v.sku})`,
  }));

  const totalQty = po.items.reduce((sum, i) => sum + i.quantity, 0);
  const receivedQty = po.items.reduce(
    (sum, i) => sum + i.receivedQty,
    0,
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <Link
                href="/admin/operations/purchase-orders"
                className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400 hover:text-white"
              >
                Purchase Orders
              </Link>
              <span className="text-neutral-600">/</span>
              <span className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200">
                {po.poNumber}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              {po.poNumber}
            </h1>
            <p className="text-xs text-neutral-400">
              {po.supplier.name} • {po.supplier.country}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs text-neutral-300">
            <POStatusForm id={po.id} status={po.status} />
            <p className="text-[0.7rem] text-neutral-400">
              Qty {receivedQty}/{totalQty} received
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-6 px-6 py-6 md:grid-cols-[2fr,1fr]">
        {/* Line items with receiving controls */}
        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Items
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      Product
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Variant
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Unit Cost
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Received
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-neutral-900 align-top hover:bg-neutral-900/40"
                    >
                      <td className="px-3 py-2 text-xs text-neutral-100">
                        <div className="flex flex-col gap-0.5">
                          <span>{item.variant.product.name}</span>
                          <span className="text-[0.7rem] text-neutral-500">
                            {item.variant.product.sku} •{" "}
                            {item.variant.product.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-300">
                        {item.variant.color} / {item.variant.size}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-neutral-100">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-neutral-100">
                        ${item.unitCost.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-neutral-100">
                        {item.receivedQty}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-neutral-100">
                        <ReceiveItemForm
                          poId={po.id}
                          itemId={item.id}
                          maxQty={item.quantity - item.receivedQty}
                        />
                      </td>
                    </tr>
                  ))}
                  {po.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-xs text-neutral-500"
                      >
                        No items yet. Use the form below to add line items to
                        this purchase order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <AddPOItemForm poId={po.id} variants={variantOptions} />
          </div>
        </div>

        {/* PO meta */}
        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Financials
            </h2>
            <div className="mt-2 space-y-1 font-mono text-[0.7rem] text-neutral-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-neutral-100">
                  ${po.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Freight</span>
                <span className="text-neutral-100">
                  ${po.freight.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duties</span>
                <span className="text-neutral-100">${po.duties.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other</span>
                <span className="text-neutral-100">
                  ${po.otherCosts.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-1 text-neutral-100">
                <span>Total</span>
                <span>${po.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Dates
            </h2>
            <div className="mt-2 space-y-1 text-[0.7rem] text-neutral-300">
              <p>
                Issue:{" "}
                <span className="text-neutral-100">
                  {po.issueDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </p>
              <p>
                Expected:{" "}
                <span className="text-neutral-100">
                  {po.expectedDate
                    ? po.expectedDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </p>
              <p>
                Received:{" "}
                <span className="text-neutral-100">
                  {po.receivedDate
                    ? po.receivedDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}



