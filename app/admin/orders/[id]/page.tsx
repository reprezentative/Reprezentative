import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UpdateTrackingForm } from "@/app/admin/operations/logistics/UpdateTrackingForm";
import { OrderStatusForm } from "./OrderStatusForm";
import { ReturnForm } from "./ReturnForm";
import { carrierTrackingUrl } from "@/lib/tracking";

type PageProps = {
  params: { id: string };
};

async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { email: true, name: true },
      },
      items: {
        include: {
          product: {
            select: { slug: true },
          },
        },
      },
      returns: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const order = await getOrder(params.id);

  if (!order) {
    notFound();
  }

  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <Link
                href="/admin/orders"
                className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400 hover:text-white"
              >
                Orders
              </Link>
              <span className="text-neutral-600">/</span>
              <span className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200">
                {order.orderNumber}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Order {order.orderNumber}
            </h1>
            <p className="text-xs text-neutral-400">
              {itemCount} item{itemCount === 1 ? "" : "s"} •{" "}
              {order.status} • {order.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="text-right text-xs text-neutral-300">
            <p className="font-semibold text-white">
              ${order.total.toFixed(2)}
            </p>
            <p className="text-[0.7rem] text-neutral-400">
              Subtotal ${order.subtotal.toFixed(2)} • Shipping $
              {order.shipping.toFixed(2)} • Tax ${order.tax.toFixed(2)}
            </p>
            <Link
              href={`/admin/orders/${order.id}/print`}
              target="_blank"
              className="mt-2 inline-block rounded border border-neutral-700 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-800"
            >
              Print packing slip
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-6 px-6 py-6 md:grid-cols-[2fr,1fr]">
        {/* Line items */}
        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Items
            </h2>
            <div className="mt-3 space-y-3 text-xs text-neutral-200">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b border-neutral-900 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {item.name}
                      </span>
                      {item.product.slug && (
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="text-[0.7rem] text-sky-400 hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                    <p className="text-[0.7rem] text-neutral-400">
                      {item.color} • {item.size}
                    </p>
                  </div>
                  <div className="text-right text-[0.7rem] text-neutral-300">
                    <p>
                      Qty {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                    <p className="font-semibold text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {order.items.length === 0 && (
                <p className="text-xs text-neutral-500">
                  No items found for this order.
                </p>
              )}
            </div>
          </div>

          {/* Order status management */}
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Order Status
            </p>
            <p className="mt-2 mb-3 text-[0.7rem] text-neutral-400">
              Update the fulfillment status. Setting the order to{" "}
              <span className="text-neutral-200">Cancelled</span> or{" "}
              <span className="text-neutral-200">Refunded</span> automatically
              returns its units to inventory. Process the monetary refund in
              Stripe separately.
            </p>
            <OrderStatusForm
              orderId={order.id}
              status={order.status}
              orderNumber={order.orderNumber}
            />
          </div>

          {/* Returns / RMA */}
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Returns &amp; Refunds
            </p>
            {order.returns.length > 0 && (
              <div className="mt-3 space-y-2 text-[0.7rem]">
                {order.returns.map((r) => {
                  const rItems = Array.isArray(r.items)
                    ? (r.items as any[])
                    : [];
                  const units = rItems.reduce(
                    (s, x) => s + (Number(x.quantity) || 0),
                    0,
                  );
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded border border-neutral-800 bg-black/40 px-3 py-2"
                    >
                      <span className="text-neutral-300">
                        {units} unit{units === 1 ? "" : "s"}
                        {r.refundAmount
                          ? ` • $${r.refundAmount.toFixed(2)} refund`
                          : ""}
                        {r.reason ? ` • ${r.reason}` : ""}
                      </span>
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-200">
                        {r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3">
              <ReturnForm
                orderId={order.id}
                hasPaymentIntent={!!order.stripePaymentIntentId}
                items={order.items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  size: i.size,
                  color: i.color,
                  quantity: i.quantity,
                  price: i.price,
                }))}
              />
            </div>
          </div>
        </div>

        {/* Customer + fulfillment */}
        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Customer
            </h2>
            <div className="mt-3 space-y-1 text-neutral-200">
              <p>{order.user?.name ?? "Customer"}</p>
              <p className="text-neutral-400">{order.user?.email}</p>
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Fulfillment
            </h2>
            <div className="mt-3 space-y-2 text-[0.7rem] text-neutral-200">
              <p>
                Status:{" "}
                <span className="font-semibold text-white">
                  {order.status}
                </span>
              </p>
              <p className="text-neutral-400">
                Shipped:{" "}
                <span className="text-neutral-200">
                  {order.shippedAt
                    ? order.shippedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </p>
              <p className="text-neutral-400">
                Delivered:{" "}
                <span className="text-neutral-200">
                  {order.deliveredAt
                    ? order.deliveredAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </p>

              <div className="mt-3 space-y-1">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Tracking
                </p>
                {order.trackingNumber && order.carrier ? (
                  <a
                    href={
                      carrierTrackingUrl(
                        order.carrier,
                        order.trackingNumber,
                      ) ?? "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    {order.trackingNumber} ({order.carrier})
                  </a>
                ) : (
                  <p className="text-neutral-500">No tracking assigned</p>
                )}
                <UpdateTrackingForm
                  orderId={order.id}
                  trackingNumber={order.trackingNumber}
                  carrier={order.carrier}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}



