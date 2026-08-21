declare module "@/components/AdminPageHelp" {
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
    | "api-keys"
    | "media"
    | "collections"
    | "size-charts"
    | "discounts"
    | "abandoned-carts"
    | "returns"
    | "reviews"
    | "back-in-stock"
    | "security"
    | "staff"
    | "audit-log"
    | "low-stock"
    | "tax"
    | "reports";

  export function AdminPageHelp(props: { page: AdminHelpKey }): JSX.Element;
}


