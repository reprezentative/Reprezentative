import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Neutral placeholder used when a product has no image yet.
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="100%" height="100%" fill="#e8e4dc"/><text x="50%" y="50%" font-family="Georgia,serif" font-size="26" fill="#9a9384" text-anchor="middle" dominant-baseline="middle">REPREZENTATIVE</text></svg>`,
  );

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function orderSizes(sizes: Record<string, number>) {
  const entries = Object.entries(sizes);
  entries.sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a[0].toUpperCase());
    const bi = SIZE_ORDER.indexOf(b[0].toUpperCase());
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const out: Record<string, number> = {};
  for (const [k, v] of entries) out[k] = v;
  return out;
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { inStock: true, status: "ACTIVE" },
    include: { variants: { where: { discontinued: false } } },
    orderBy: { createdAt: "desc" },
  });

  const mapped = products.map((p) => {
    // Sum available stock per size across variants (color-agnostic storefront).
    const sizes: Record<string, number> = {};
    for (const v of p.variants) {
      const key = v.size;
      sizes[key] = (sizes[key] ?? 0) + Math.max(0, v.available ?? v.stock);
    }
    const img = p.images?.[0] || PLACEHOLDER;
    const detail = p.images?.[1] || p.images?.[0] || PLACEHOLDER;
    return {
      id: p.slug,
      name: p.name,
      colorway: p.variants[0]?.color || "",
      price: p.price,
      img,
      detail,
      blurb:
        p.metaDescription ||
        (p.description ? p.description.slice(0, 140) : ""),
      story: p.description || "",
      sizes: orderSizes(sizes),
    };
  });

  const templatePath = path.join(process.cwd(), "lib", "store-template.html");
  let html = await fs.readFile(templatePath, "utf8");

  // Inject live products. Use a function replacement so "$" in product text is
  // not treated as a special replacement pattern, and neutralize "</" so a
  // description can never break out of the <script> tag.
  const json = JSON.stringify(mapped).replace(/<\//g, "<\\/");
  html = html.replace("__PRODUCTS__", () => json);

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
