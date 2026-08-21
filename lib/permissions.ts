// Granular staff permissions. ADMIN implicitly has all of them; STAFF users
// get exactly what's assigned. Used to scope access for non-owner team members.

export const PERMISSIONS = [
  { key: "products", label: "Products & inventory" },
  { key: "orders", label: "Orders & fulfillment" },
  { key: "returns", label: "Returns & refunds" },
  { key: "customers", label: "Customers" },
  { key: "discounts", label: "Discounts & gift cards" },
  { key: "reviews", label: "Reviews moderation" },
  { key: "content", label: "Content & media" },
  { key: "analytics", label: "Analytics & reports" },
  { key: "settings", label: "Settings" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Does a user (role + permissions) have a given permission?
export function hasPermission(
  role: string,
  permissions: string[] | null | undefined,
  key: PermissionKey,
): boolean {
  if (role === "ADMIN") return true;
  if (role !== "STAFF") return false;
  return (permissions ?? []).includes(key);
}
