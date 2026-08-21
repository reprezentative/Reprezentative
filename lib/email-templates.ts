// Simple, self-contained HTML email templates (inline styles for client support).

const BRAND = "REPREZENTATIVE";
const wrap = (inner: string) => `
  <div style="font-family:Georgia,serif;background:#0a0a0a;color:#e5e5e5;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #262626;border-radius:8px;padding:28px">
      <h1 style="font-size:16px;letter-spacing:3px;margin:0 0 20px">${BRAND}</h1>
      ${inner}
      <p style="margin-top:28px;font-size:11px;color:#666">${BRAND} · This email was sent by your store.</p>
    </div>
  </div>`;

const money = (n: number) => "$" + Number(n || 0).toFixed(2);

type OrderLike = {
  orderNumber: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  items: { name: string; size: string; quantity: number; price: number }[];
  trackingNumber?: string | null;
  carrier?: string | null;
};

export function orderConfirmationEmail(order: OrderLike) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#ddd">${i.name} — ${i.size} × ${i.quantity}</td><td style="padding:6px 0;text-align:right;color:#ddd">${money(i.price * i.quantity)}</td></tr>`,
    )
    .join("");
  return {
    subject: `Order ${order.orderNumber} confirmed`,
    html: wrap(`
      <p style="font-size:14px">Thanks for your order — it's confirmed.</p>
      <p style="font-size:13px;color:#aaa">Order <b style="color:#fff">${order.orderNumber}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">${rows}
        <tr><td style="padding-top:12px;border-top:1px solid #262626;color:#999">Subtotal</td><td style="padding-top:12px;border-top:1px solid #262626;text-align:right;color:#999">${money(order.subtotal)}</td></tr>
        ${order.discount ? `<tr><td style="color:#7dd3a0">Discount</td><td style="text-align:right;color:#7dd3a0">-${money(order.discount)}</td></tr>` : ""}
        <tr><td style="color:#999">Shipping</td><td style="text-align:right;color:#999">${order.shipping === 0 ? "Free" : money(order.shipping)}</td></tr>
        ${order.tax ? `<tr><td style="color:#999">Tax</td><td style="text-align:right;color:#999">${money(order.tax)}</td></tr>` : ""}
        <tr><td style="padding-top:8px;color:#fff;font-weight:bold">Total</td><td style="padding-top:8px;text-align:right;color:#fff;font-weight:bold">${money(order.total)}</td></tr>
      </table>
      <p style="font-size:12px;color:#888;margin-top:16px">We'll email you again when it ships.</p>
    `),
  };
}

export function shippingEmail(order: OrderLike) {
  return {
    subject: `Your order ${order.orderNumber} has shipped`,
    html: wrap(`
      <p style="font-size:14px">Good news — your order is on its way.</p>
      <p style="font-size:13px;color:#aaa">Order <b style="color:#fff">${order.orderNumber}</b></p>
      ${
        order.trackingNumber
          ? `<p style="font-size:13px">Carrier: <b style="color:#fff">${order.carrier ?? ""}</b><br/>Tracking: <b style="color:#fff">${order.trackingNumber}</b></p>`
          : ""
      }
    `),
  };
}

export function abandonedCartEmail(email: string, items: any[]) {
  const rows = (items || [])
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#ddd">${i.name ?? "Item"} ${i.size ? "— " + i.size : ""} × ${i.qty ?? 1}</td></tr>`,
    )
    .join("");
  return {
    subject: `You left something in your bag`,
    html: wrap(`
      <p style="font-size:14px">Still thinking it over? Your bag is waiting.</p>
      <table style="width:100%;font-size:13px;margin-top:8px">${rows}</table>
      <p style="margin-top:20px"><a href="#" style="display:inline-block;background:#fff;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:12px;letter-spacing:1px">RETURN TO YOUR BAG</a></p>
    `),
  };
}
