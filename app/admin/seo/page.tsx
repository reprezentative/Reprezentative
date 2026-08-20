import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";

export default async function AdminSeoPage() {
  const [totalProducts, missingMeta, recentProducts] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      where: {
        OR: [
          { metaTitle: null },
          { metaTitle: "" },
          { metaDescription: null },
          { metaDescription: "" },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const productsMissingMeta = missingMeta.length;
  const coverage =
    totalProducts > 0
      ? Math.round(((totalProducts - productsMissingMeta) / totalProducts) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">SEO Tools</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Monitor product SEO coverage and spot missing titles and
              descriptions.
            </p>
          </div>
          <AdminPageHelp page="seo" />
        </div>
      </div>

      <section className="space-y-6 px-6 py-6 text-xs">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Products
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {totalProducts}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              Total products in your catalog.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              Missing SEO Meta
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {productsMissingMeta}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              Products missing either a meta title or meta description.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              SEO Coverage
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {coverage}%
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              Share of products with both title and description set.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Products Missing SEO
              </p>
              <p className="text-[0.7rem] text-neutral-500">
                Showing up to 20 most recent.
              </p>
            </div>

            <div className="mt-3 divide-y divide-neutral-900 border-t border-neutral-900">
              {missingMeta.length === 0 && (
                <p className="py-4 text-[0.7rem] text-neutral-500">
                  All products have meta titles and descriptions. Nice work.
                </p>
              )}

              {missingMeta.map((product) => {
                const missingTitle =
                  !product.metaTitle || product.metaTitle.trim().length === 0;
                const missingDescription =
                  !product.metaDescription ||
                  product.metaDescription.trim().length === 0;

                return (
                  <div
                    key={product.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-medium text-white">
                        {product.name}
                      </p>
                      <p className="text-[0.7rem] text-neutral-500">
                        /product/{product.slug}
                      </p>
                      <p className="mt-1 text-[0.7rem] text-neutral-400">
                        {missingTitle && "Missing meta title."}{" "}
                        {missingDescription && "Missing meta description."}
                      </p>
                    </div>
                    <p className="text-[0.7rem] text-neutral-500">
                      {product.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Recently Updated Products
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              Quick view of SEO fields for your newest items.
            </p>

            <div className="mt-3 divide-y divide-neutral-900 border-t border-neutral-900">
              {recentProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-1 py-3 text-[0.7rem]"
                >
                  <p className="text-xs font-medium text-white">
                    {product.name}
                  </p>
                  <p className="text-neutral-500">/product/{product.slug}</p>
                  <p className="text-neutral-400">
                    Title:{" "}
                    {product.metaTitle && product.metaTitle.trim().length > 0
                      ? product.metaTitle
                      : "—"}
                  </p>
                  <p className="text-neutral-400">
                    Description:{" "}
                    {product.metaDescription &&
                    product.metaDescription.trim().length > 0
                      ? product.metaDescription
                      : "—"}
                  </p>
                </div>
              ))}

              {recentProducts.length === 0 && (
                <p className="py-4 text-[0.7rem] text-neutral-500">
                  No products found.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-dashed border-neutral-800 bg-zinc-950/40 p-4 text-[0.7rem] text-neutral-300">
          <p className="font-semibold text-neutral-100">
            What this page covers today
          </p>
          <p className="mt-1 text-neutral-400">
            This initial SEO view focuses on visibility and hygiene: which
            products are missing basic meta data, and how complete your catalog
            is overall. In a future phase we can add editable global settings,
            AI-assisted meta suggestions, and direct links into the product
            editor for one-click fixes.
          </p>
        </div>
      </section>
    </main>
  );
}

