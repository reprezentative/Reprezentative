import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export default async function AccountWishlistPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your wishlist
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Please sign in to view your wishlist.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-white px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const userId = (session.user as any).id as string | undefined;

  if (!userId) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your wishlist
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            We could not determine your account. Please sign out and sign back
            in.
          </p>
        </section>
      </main>
    );
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: true,
    },
    orderBy: { addedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-900 bg-black/90 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your wishlist
          </h1>
          <Link
            href="/shop"
            className="text-xs uppercase tracking-[0.18em] text-neutral-400 hover:text-white"
          >
            Continue shopping
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        {items.length === 0 && (
          <p className="text-sm text-neutral-400">
            You have no items in your wishlist yet.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.product.slug}`}
              className="group flex flex-col gap-3 rounded-md border border-neutral-900 bg-neutral-950 p-3"
            >
              <div className="relative overflow-hidden rounded-md bg-neutral-900">
                {item.product.images?.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.images[0] as string}
                    alt={item.product.name}
                    className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-44 w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-white">
                  {item.product.name}
                </p>
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                  {item.product.category}
                </p>
                <p className="text-sm text-neutral-100">
                  ${item.product.price.toFixed(2)}
                </p>
                <p className="text-[0.7rem] text-neutral-500">
                  Added{" "}
                  {item.addedAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}



