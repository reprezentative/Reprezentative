import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function PackingSlipPage({ params }: PageProps) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, name: true } },
      items: true,
    },
  });

  if (!order) notFound();

  const shipTo = await prisma.address.findFirst({
    where: { userId: order.userId },
    orderBy: { isDefault: "desc" },
  });

  const money = (n: number) => "$" + Number(n || 0).toFixed(2);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-3xl p-8 print:p-0">
        <div className="mb-6 flex items-start justify-between print:mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em]">
              REPREZENTATIVE
            </h1>
            <p className="text-sm text-neutral-600">Packing Slip / Invoice</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{order.orderNumber}</p>
            <p className="text-neutral-600">
              {order.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-neutral-600">{order.status}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Ship To
            </p>
            <p>{shipTo?.name ?? order.user?.name ?? "Customer"}</p>
            {shipTo && (
              <>
                <p>{shipTo.street}</p>
                <p>
                  {shipTo.city}
                  {shipTo.state ? `, ${shipTo.state}` : ""} {shipTo.zipCode}
                </p>
                <p>{shipTo.country}</p>
              </>
            )}
            <p className="text-neutral-600">{order.user?.email}</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Shipment
            </p>
            {order.carrier || order.trackingNumber ? (
              <>
                <p>{order.carrier}</p>
                <p>{order.trackingNumber}</p>
              </>
            ) : (
              <p className="text-neutral-500">Not yet shipped</p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2">Item</th>
              <th className="py-2">Size</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-neutral-300">
                <td className="py-2">
                  {i.name}
                  {i.color ? (
                    <span className="text-neutral-500"> · {i.color}</span>
                  ) : null}
                </td>
                <td className="py-2">{i.size}</td>
                <td className="py-2 text-center">{i.quantity}</td>
                <td className="py-2 text-right">{money(i.price)}</td>
                <td className="py-2 text-right">
                  {money(i.price * i.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-8 text-neutral-600">Subtotal</td>
                <td className="text-right">{money(order.subtotal)}</td>
              </tr>
              {order.discount > 0 && (
                <tr>
                  <td className="pr-8 text-neutral-600">Discount</td>
                  <td className="text-right">-{money(order.discount)}</td>
                </tr>
              )}
              <tr>
                <td className="pr-8 text-neutral-600">Shipping</td>
                <td className="text-right">
                  {order.shipping === 0 ? "Free" : money(order.shipping)}
                </td>
              </tr>
              {order.tax > 0 && (
                <tr>
                  <td className="pr-8 text-neutral-600">Tax</td>
                  <td className="text-right">{money(order.tax)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-black font-bold">
                <td className="pr-8 pt-2">Total</td>
                <td className="pt-2 text-right">{money(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          {itemCount} item{itemCount === 1 ? "" : "s"} · Thank you for shopping
          with REPREZENTATIVE
        </p>

        <div className="mt-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
