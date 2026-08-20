"use client";

import { useState } from "react";

export type AdminHelpKey =
  | "dashboard"
  | "products"
  | "content"
  | "orders"
  | "customers"
  | "inventory"
  | "finance-cogs"
  | "finance-expenses"
  | "finance-profit"
  | "finance-pricing"
  | "operations-suppliers"
  | "operations-purchase-orders"
  | "operations-logistics"
  | "analytics"
  | "marketing"
  | "seo"
  | "ai-assistant"
  | "settings"
  | "api-keys";

type HelpCopy = {
  title: string;
  summary: string;
  bullets?: string[];
  caveats?: string[];
};

const HELP_CONTENT: Record<AdminHelpKey, HelpCopy> = {
  dashboard: {
    title: "Admin Dashboard",
    summary:
      "High-level overview of revenue, orders, and customers so you can see how the business is performing at a glance.",
    bullets: [
      "Revenue tiles summarize sales today, last 7 days, and last 30 days.",
      "Recent orders list shows the latest activity and customer details.",
      "Open orders highlight what's still in-flight for fulfillment.",
    ],
    caveats: [
      "Numbers reflect data already in the system – they do not include cancelled or refunded orders.",
    ],
  },
  products: {
    title: "Products",
    summary:
      "Manage your product catalog, pricing, and visibility across the storefront and admin.",
    bullets: [
      "Search by name, SKU, or category to quickly find products.",
      "Filters help you focus on featured or currently in-stock items.",
      "Click into a product row to edit details, images, variants, and SEO.",
    ],
    caveats: [
      "Edits save immediately and impact both storefront and analytics views.",
    ],
  },
  content: {
    title: "Content Manager",
    summary:
      "Edit key homepage sections like the hero, featured split, banners, and editorial blocks with a live preview.",
    bullets: [
      "Use the tabs to switch between hero, featured split, banners, editorial, newsletter, and footer content.",
      "Changes autosave after a short delay and refresh the preview pane on the left.",
      "Keep copy concise and consistent with your brand voice to avoid overcrowding the layout.",
    ],
    caveats: [
      "Updates are applied immediately to the live homepage once saved.",
      "This screen focuses on homepage content; other pages are managed separately or in future phases.",
    ],
  },
  orders: {
    title: "Orders",
    summary:
      "Review customer orders, update status, and keep shipping information in sync.",
    bullets: [
      "Filter by status to focus on pending, processing, or shipped orders.",
      "Search by order number, customer email, or name.",
      "Click into an order to see line items and update fulfillment details.",
    ],
    caveats: [
      "Refunds and payment adjustments should still be handled in Stripe as configured.",
    ],
  },
  customers: {
    title: "Customers",
    summary:
      "View customer profiles, their spend, and order history for retention and VIP decisions.",
    bullets: [
      "Each row shows total orders, spend, and average order value.",
      "Click into a customer to see more detailed history and profile context.",
    ],
    caveats: [
      "Customer metrics are based on completed orders only; cancelled or refunded orders are excluded.",
    ],
  },
  inventory: {
    title: "Inventory Manager",
    summary:
      "Central view of stock, reserved, and available units for every product variant.",
    bullets: [
      "Rows are color-coded for in stock, low stock, and out of stock.",
      "Use the actions on each row to adjust stock and log changes to history.",
    ],
    caveats: [
      "Inventory changes affect available units across storefront, cart, and purchase orders.",
    ],
  },
  "finance-cogs": {
    title: "COGS Manager",
    summary:
      "Track detailed cost of goods for each product, including materials, manufacturing, freight, and inventory costs.",
    bullets: [
      "Latest COGS per product drives profit and margin calculations across the app.",
      "Use per-product views to refine inputs when costs change over time.",
    ],
    caveats: [
      "Historical COGS entries are preserved for audit but only the latest entry is used in most summaries.",
    ],
  },
  "finance-expenses": {
    title: "Expense Tracking",
    summary:
      "Log operating expenses by category to understand burn and profitability.",
    bullets: [
      "Use the form at the top to add one-off or recurring expenses.",
      "Monthly totals and category breakdowns help you see trends quickly.",
    ],
    caveats: [
      "Expenses feed into Profit & Loss views but do not affect orders or inventory.",
    ],
  },
  "finance-profit": {
    title: "Profit & Loss",
    summary:
      "High-level P&L view combining revenue, COGS, and expenses to show profitability.",
    bullets: [
      "Top cards summarize revenue, COGS, gross profit, expenses, and net profit.",
      "Product table surfaces which items contribute most to profit.",
    ],
    caveats: [
      "This is an operational P&L – it is not a replacement for formal accounting or tax reporting.",
    ],
  },
  "finance-pricing": {
    title: "AI Pricing Engine",
    summary:
      "Compare current prices to latest COGS per product and use AI recommendations to tune margins.",
    bullets: [
      "Each row shows price, latest cost per unit, and implied margin, highlighting gaps and outliers.",
      "Use AI recommendations as a starting point for price changes, especially when COGS has recently moved.",
      "Focus on products with low margins or high COGS to protect profitability before running campaigns.",
    ],
    caveats: [
      "AI suggestions are guidance only – they do not automatically change prices until you update products.",
      "Always consider brand positioning and competitive context before applying major price changes.",
    ],
  },
  "operations-suppliers": {
    title: "Suppliers",
    summary:
      "Manage manufacturers and supply partners, along with basic performance stats.",
    bullets: [
      "Add suppliers with contact details, MOQs, lead times, and quality ratings.",
      "Click into a supplier to see more detail and related purchase orders.",
    ],
    caveats: [
      "Supplier data is operational only and does not automatically update pricing or COGS.",
    ],
  },
  "operations-purchase-orders": {
    title: "Purchase Orders",
    summary:
      "Create and track inbound purchase orders to keep inventory in sync with production.",
    bullets: [
      "Use the form to create new POs tied to suppliers and variants.",
      "Statuses help you track each PO from draft through received.",
    ],
    caveats: [
      "Receiving items from a PO updates inventory and stock history; double-check quantities before marking as received.",
    ],
  },
  "operations-logistics": {
    title: "Shipments",
    summary:
      "Lightweight view of outbound shipments with tracking details for recent orders.",
    bullets: [
      "Assign or update tracking numbers and carriers per order.",
      "Quickly scan which orders have shipped and which are still waiting.",
    ],
    caveats: [
      "This screen does not replace carrier dashboards; it focuses on a simple, unified view inside admin.",
    ],
  },
  analytics: {
    title: "Analytics",
    summary:
      "Core sales and customer metrics, with a trend view over your selected date range.",
    bullets: [
      "Top tiles summarize revenue, orders, average order value, and active customers.",
      "The revenue trend chart shows how sales move over time.",
    ],
    caveats: [
      "Analytics are derived from orders already in the system; they do not include offline or external sales.",
    ],
  },
  marketing: {
    title: "Marketing Hub",
    summary:
      "Snapshot of how discounts and newsletter growth are contributing to revenue.",
    bullets: [
      "See total revenue and how much comes from discounted orders.",
      "Track newsletter subscriber counts and recent growth.",
    ],
    caveats: [
      "This is a read-only overview today; future work can add campaign creation and more detailed attribution.",
    ],
  },
  seo: {
    title: "SEO Tools",
    summary:
      "Monitor SEO coverage for products and quickly spot missing titles and descriptions.",
    bullets: [
      "KPI tiles show overall coverage and how many products are missing meta data.",
      "Use the lists to prioritize which products to update next.",
    ],
    caveats: [
      "SEO settings are product-level only for now; global site metadata is handled separately.",
    ],
  },
  "ai-assistant": {
    title: "AI Assistant",
    summary:
      "Ask business questions about revenue, inventory, and profitability and get analyst-style answers.",
    bullets: [
      "Type natural language questions; the assistant responds with concise, numeric answers where possible.",
      "Use this alongside dashboards to pressure-test decisions or scenarios.",
    ],
    caveats: [
      "The assistant uses summarized data and heuristics; double-check critical decisions against raw reports.",
    ],
  },
  settings: {
    title: "System Settings",
    summary:
      "Store-level configuration for branding, support details, feature toggles, and dev tools.",
    bullets: [
      "Brand basics flow through navigation, emails, and metadata.",
      "Feature toggles control visibility of wishlist and AI surfaces.",
      "In non-production, a system reset tool helps you clear and reseed demo data.",
    ],
    caveats: [
      "Settings changes take effect immediately across the app; use caution in production environments.",
    ],
  },
  "api-keys": {
    title: "API Keys & Integrations",
    summary:
      "Central place to see which core services are configured and to paste or rotate sensitive API keys.",
    bullets: [
      "Status badges show whether Stripe, DeepSeek, email, storage, tax, and address validation are wired up.",
      "Use the edit controls in each card to paste new keys or credentials without touching environment files.",
      "Rotate keys here when team members change or vendors update credentials.",
    ],
    caveats: [
      "Treat all keys and credentials on this page as highly sensitive secrets.",
      "For production, environment variables may still be preferred depending on your hosting setup.",
    ],
  },
};

export function AdminPageHelp({ page }: { page: AdminHelpKey }) {
  const [open, setOpen] = useState(false);
  const copy = HELP_CONTENT[page];

  if (!copy) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-black text-[0.7rem] text-neutral-200 hover:border-neutral-500 hover:text-white"
        aria-label={`Open help for ${copy.title}`}
      >
        i
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-md border border-neutral-800 bg-zinc-950 p-4 text-xs shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Page Help
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white">
                  {copy.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[0.7rem] text-neutral-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-[0.75rem] text-neutral-200">
              {copy.summary}
            </p>

            {copy.bullets && copy.bullets.length > 0 && (
              <div className="mt-3 space-y-1">
                {copy.bullets.map((item) => (
                  <p
                    key={item}
                    className="flex gap-2 text-[0.75rem] text-neutral-300"
                  >
                    <span className="mt-[3px] h-1 w-1 rounded-full bg-neutral-500" />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            )}

            {copy.caveats && copy.caveats.length > 0 && (
              <div className="mt-4 rounded-md border border-amber-800/60 bg-amber-950/40 p-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-300">
                  Caveats
                </p>
                <div className="mt-2 space-y-1 text-[0.7rem] text-amber-100">
                  {copy.caveats.map((item) => (
                    <p key={item}>
                      <span className="mr-1">•</span>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}


