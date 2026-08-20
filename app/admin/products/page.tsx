import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { DeleteProductButton } from "./DeleteProductButton";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 20;

type SearchParams = {
  q?: string;
  category?: string;
  featured?: string;
  inStock?: string;
  page?: string;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = (searchParams.q ?? "").trim();
  const categoryFilter = (searchParams.category ?? "").trim();
  const featuredFilter = searchParams.featured === "true";
  const inStockFilter = searchParams.inStock === "true";
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);

  const where: any = {};

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { category: { contains: query, mode: "insensitive" } },
    ];
  }

  if (categoryFilter) {
    where.category = categoryFilter;
  }

  if (featuredFilter) {
    where.featured = true;
  }

  if (inStockFilter) {
    where.inStock = true;
  }

  const [totalCount, products, categoryRows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const categories = categoryRows.map((row) => row.category);

  const makeQuery = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();

    const base: SearchParams = {
      q: searchParams.q,
      category: searchParams.category,
      featured: searchParams.featured,
      inStock: searchParams.inStock,
      page: searchParams.page,
      ...overrides,
    };

    Object.entries(base).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Manage your product catalog, pricing, and visibility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminPageHelp page="products" />
            <Link
              href="/admin/products/new"
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200"
            >
              Add Product
            </Link>
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        {/* Filters & search */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <form className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name, SKU, or category"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none ring-0 placeholder:text-neutral-500 focus:border-neutral-500"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-neutral-700 px-3 text-xs uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category filter */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[0.7rem] text-neutral-400">Category:</span>
              <Link
                href={makeQuery({ category: undefined, page: "1" })}
                className={`rounded-full border px-2.5 py-1 ${
                  !categoryFilter
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={makeQuery({ category: cat, page: "1" })}
                  className={`rounded-full border px-2.5 py-1 ${
                    categoryFilter === cat
                      ? "border-white bg-white text-black"
                      : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>

            {/* Featured toggle */}
            <Link
              href={makeQuery({
                featured: featuredFilter ? undefined : "true",
                page: "1",
              })}
              className={`h-9 rounded-md border px-2.5 inline-flex items-center ${
                featuredFilter
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600"
              }`}
            >
              Featured
            </Link>

            {/* In stock toggle */}
            <Link
              href={makeQuery({
                inStock: inStockFilter ? undefined : "true",
                page: "1",
              })}
              className={`h-9 rounded-md border px-2.5 inline-flex items-center ${
                inStockFilter
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600"
              }`}
            >
              In Stock
            </Link>

            {/* Clear filters */}
            {(query || categoryFilter || featuredFilter || inStockFilter) && (
              <Link
                href="/admin/products"
                className="text-[0.7rem] text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
              >
                Clear
              </Link>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-zinc-900/80 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-left font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-center font-medium">Featured</th>
                <th className="px-3 py-2 text-center font-medium">In Stock</th>
                <th className="px-3 py-2 text-right font-medium">Created</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-t border-neutral-900 hover:bg-neutral-900/50"
                >
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="inline-flex flex-col gap-0.5"
                    >
                      <span className="text-xs font-medium text-white">
                        {product.name}
                      </span>
                      <span className="text-[0.7rem] text-neutral-500">
                        {product.slug}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-neutral-200">
                    {product.category}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-neutral-400">
                    {product.sku}
                  </td>
                  <td className="px-3 py-2 align-top text-right text-xs text-neutral-100">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    {product.featured ? (
                      <span className="inline-flex h-5 items-center justify-center rounded-full bg-emerald-500/15 px-2 text-[0.65rem] font-semibold text-emerald-300">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex h-5 items-center justify-center rounded-full bg-neutral-800 px-2 text-[0.65rem] text-neutral-400">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    {product.inStock ? (
                      <span className="inline-flex h-5 items-center justify-center rounded-full bg-blue-500/15 px-2 text-[0.65rem] font-semibold text-blue-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex h-5 items-center justify-center rounded-full bg-neutral-800 px-2 text-[0.65rem] text-neutral-400">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-right text-[0.7rem] text-neutral-500">
                    {product.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2 align-top text-right text-[0.7rem]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="inline-flex items-center rounded-md border border-neutral-700 px-2 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
                      >
                        Edit
                      </Link>
                      <DeleteProductButton
                        productId={product.id}
                        productName={product.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No products found. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination summary + controls */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-[0.7rem] text-neutral-400 md:flex-row">
          <p>
            Showing{" "}
            <span className="text-neutral-100">
              {products.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {(page - 1) * PAGE_SIZE + products.length}
            </span>{" "}
            of <span className="text-neutral-100">{totalCount}</span> products
          </p>

          <Pagination
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => makeQuery({ page: String(p) })}
          />
        </div>
      </section>
    </main>
  );
}


