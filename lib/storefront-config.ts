// Which storefront is live.
//   "new" -> the data-driven store at /store; old storefront routes redirect to it.
//   "old" -> the original Next.js storefront serves normally; /store still works.
// Flip this one value to switch back to the old storefront.
export const ACTIVE_STOREFRONT: "new" | "old" = "new";
