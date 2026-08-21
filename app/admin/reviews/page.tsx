import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHelp } from "@/components/AdminPageHelp";
import { ReviewActions } from "./ReviewRow";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string };

const FILTERS = ["", "PENDING", "APPROVED", "REJECTED"];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const status = (searchParams.status ?? "").trim();
  const where: any = {};
  if (status) where.status = status;

  const [reviews, pending] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, slug: true } } },
    }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Reviews</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Moderate customer reviews. Approved reviews appear on the
              storefront.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[0.7rem] text-neutral-400">
              {pending} pending
            </p>
            <AdminPageHelp page="reviews" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        <div className="mb-4 flex flex-wrap gap-2 text-[0.7rem]">
          {FILTERS.map((s) => (
            <Link
              key={s || "ALL"}
              href={s ? `?status=${s}` : "?"}
              className={`rounded-full border px-2.5 py-1 ${
                status === s
                  ? "border-white bg-white text-black"
                  : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
              }`}
            >
              {s || "All"}
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-400">
                      {"★".repeat(r.rating)}
                      <span className="text-neutral-700">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </span>
                    <span className="font-medium text-white">
                      {r.title ?? "Review"}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] ${
                        r.status === "APPROVED"
                          ? "bg-emerald-950 text-emerald-300"
                          : r.status === "REJECTED"
                            ? "bg-amber-950 text-amber-300"
                            : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-300">{r.body}</p>
                  <p className="mt-2 text-[0.7rem] text-neutral-500">
                    {r.authorName} ·{" "}
                    {r.product ? (
                      <Link
                        href={`/product/${r.product.slug}`}
                        className="text-sky-400 hover:underline"
                      >
                        {r.product.name}
                      </Link>
                    ) : (
                      "Product"
                    )}{" "}
                    ·{" "}
                    {r.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <ReviewActions id={r.id} status={r.status} />
              </div>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="rounded-md border border-neutral-800 bg-zinc-950/60 px-4 py-10 text-center text-xs text-neutral-500">
              No reviews{status ? ` with status ${status}` : ""} yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
