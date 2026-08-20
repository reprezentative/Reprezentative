import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ACTIVE_STOREFRONT } from "@/lib/storefront-config";

// Old storefront entry points that should redirect to the new /store when it's active.
function isStorefrontPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname.startsWith("/shop/") ||
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/product" ||
    pathname.startsWith("/product/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Admin gate (page-level; API routes enforce their own auth).
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req });
    if (!token || (token as any).role !== "ADMIN") {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) Legacy access: view the original storefront under /legacy/* by rewriting
  //    to the real routes (middleware does not re-run on a rewrite, so these
  //    are not caught by the redirect below).
  if (pathname === "/legacy" || pathname.startsWith("/legacy/")) {
    const rest = pathname.replace(/^\/legacy/, "") || "/";
    return NextResponse.rewrite(new URL(rest + search, req.url));
  }

  // 3) When the new storefront is active, redirect old storefront routes to it.
  if (ACTIVE_STOREFRONT === "new" && isStorefrontPath(pathname)) {
    return NextResponse.redirect(new URL("/store", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
    "/shop/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/product/:path*",
    "/legacy/:path*",
  ],
};
