import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewsletterForm } from "@/components/NewsletterForm";

type HeroContent = {
  videoUrl?: string;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
};

type FeaturedSplitContent = {
  videoUrl?: string;
  imageUrl?: string;
  heading?: string;
  bodyText?: string;
  ctaText?: string;
  ctaLink?: string;
};

type BannerContent = {
  videoUrl?: string;
  imageUrl?: string;
  heading?: string;
  ctaText?: string;
  ctaLink?: string;
};

// Content type for individual homepage sections (hero_2, promo_left, promo_right)
type SectionContent = {
  videoUrl?: string;
  imageUrl?: string;
  heading?: string;
  bodyText?: string;
  ctaText?: string;
  ctaLink?: string;
};

type ThreeColumnsContent = {
  columns?: Array<{
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    link?: string;
  }>;
};

type EditorialContent = {
  heading?: string;
  paragraph1?: string;
  paragraph2?: string;
  ctaText?: string;
  ctaLink?: string;
};

type NewsletterContent = {
  heading?: string;
  subheading?: string;
  buttonText?: string;
};

type FooterContent = {
  company?: string;
  copyright?: string;
};

type HomepageLayout = "ralph" | "drop";

export default async function HomePage() {
  const [
    heroRecord,
    hero2Record,
    promoLeftRecord,
    promoRightRecord,
    featuredRecord,
    bannerRecord,
    columnsRecord,
    editorialRecord,
    newsletterRecord,
    footerRecord,
    newArrivals,
    featuredProducts,
    generalSettingsRow,
  ] = await Promise.all([
    prisma.content.findUnique({ where: { key: "hero" } }),
    prisma.content.findUnique({ where: { key: "hero_2" } }),
    prisma.content.findUnique({ where: { key: "promo_left" } }),
    prisma.content.findUnique({ where: { key: "promo_right" } }),
    prisma.content.findUnique({ where: { key: "featured_split" } }),
    prisma.content.findUnique({ where: { key: "full_width_banner" } }),
    prisma.content.findUnique({ where: { key: "three_columns" } }),
    prisma.content.findUnique({ where: { key: "editorial" } }),
    prisma.content.findUnique({ where: { key: "newsletter_section" } }),
    prisma.content.findUnique({ where: { key: "footer" } }),
    prisma.product.findMany({
      where: { inStock: true, isNew: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { inStock: true, featured: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.setting.findUnique({ where: { key: "general" } }),
  ]);

  const hero = (heroRecord?.data ?? null) as HeroContent | null;
  const hero2 = (hero2Record?.data ?? null) as SectionContent | null;
  const promoLeft = (promoLeftRecord?.data ?? null) as SectionContent | null;
  const promoRight = (promoRightRecord?.data ?? null) as SectionContent | null;
  const featuredSplit = (featuredRecord?.data ?? null) as
    | FeaturedSplitContent
    | null;
  const banner = (bannerRecord?.data ?? null) as BannerContent | null;
  const threeColumns = (columnsRecord?.data ?? null) as
    | ThreeColumnsContent
    | null;
  const editorial = (editorialRecord?.data ?? null) as EditorialContent | null;
  const newsletter = (newsletterRecord?.data ?? null) as
    | NewsletterContent
    | null;
  const footer = (footerRecord?.data ?? null) as FooterContent | null;

  const generalValue = (generalSettingsRow?.value ??
    {}) as Partial<{ homepageLayout: HomepageLayout }>;
  const layout: HomepageLayout =
    generalValue.homepageLayout === "drop" ? "drop" : "ralph";

  const heroMedia = hero?.videoUrl;
  // Treat typical video URLs (mp4 or known video download patterns) as video;
  // otherwise render the heroMedia as a static image.
  const heroIsVideo =
    typeof heroMedia === "string" &&
    /(\.mp4($|\?)|\/video\/|video-files)/i.test(heroMedia);

  // Helper function to detect if a URL is a video
  const isVideoUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    return /(\.mp4($|\?)|\/video\/|video-files)/i.test(url);
  };

  // Get media URL for Featured Split (prefer videoUrl, fallback to imageUrl)
  const featuredSplitMedia = featuredSplit?.videoUrl || featuredSplit?.imageUrl;
  const featuredSplitIsVideo = isVideoUrl(featuredSplitMedia);

  // Get media URL for Banner (prefer videoUrl, fallback to imageUrl)
  const bannerMedia = banner?.videoUrl || banner?.imageUrl;
  const bannerIsVideo = isVideoUrl(bannerMedia);

  // Helper to get media for section content
  const getSectionMedia = (section: SectionContent | null) => {
    return section?.videoUrl || section?.imageUrl;
  };
  const hero2Media = getSectionMedia(hero2);
  const hero2IsVideo = isVideoUrl(hero2Media);
  const promoLeftMedia = getSectionMedia(promoLeft);
  const promoLeftIsVideo = isVideoUrl(promoLeftMedia);
  const promoRightMedia = getSectionMedia(promoRight);
  const promoRightIsVideo = isVideoUrl(promoRightMedia);

  if (layout === "drop") {
    return (
      <main className="min-h-screen bg-black text-white">
        {/* Navigation */}
        <nav className="fixed inset-x-0 top-0 z-20 border-b border-neutral-900 bg-black/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
            <div className="text-xs font-medium tracking-[0.2em] text-white">
              REPREZENTATIVE
            </div>
            <ul className="hidden items-center gap-8 text-[0.7rem] uppercase tracking-[0.18em] text-neutral-300 md:flex">
              <li>
                <Link href="#latest-drop" className="hover:text-white">
                  Latest Drop
                </Link>
              </li>
              <li>
                <Link href="#all-drops" className="hover:text-white">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="#story" className="hover:text-white">
                  Brand Story
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className="flex flex-col pt-16 md:pt-20">
          {/* Drop hero with media */}
          <section
            id="latest-drop"
            className="relative border-b border-neutral-900 bg-black px-0 pb-10 md:pb-16"
          >
            {heroMedia ? (
              heroIsVideo ? (
                <video
                  className="h-[70vh] w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={heroMedia} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroMedia}
                  alt={hero?.headline ?? ""}
                  className="h-[70vh] w-full object-cover"
                />
              )
            ) : (
              <div className="h-[70vh] w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6 md:flex-row md:items-end md:justify-between md:px-8">
                <div className="space-y-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-neutral-300">
                    Latest Drop
                  </p>
                  <h1 className="text-3xl font-light tracking-tight text-white md:text-4xl">
                    {hero?.headline ?? "New Program"}
                  </h1>
                  <p className="max-w-md text-sm text-neutral-300">
                    {hero?.subheadline ??
                      "Weekly capsules, limited runs, and collaborations."}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 text-[0.7rem] uppercase tracking-[0.18em] text-neutral-200">
                  <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300/40 bg-black/40 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live Now
                  </span>
                  <Link
                    href={hero?.ctaLink ?? "/shop"}
                    className="pointer-events-auto rounded-full border border-white px-4 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-white hover:text-black"
                  >
                    {hero?.ctaText ?? "Shop Drop"}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-6xl px-4 md:px-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(featuredProducts.length > 0
                  ? featuredProducts
                  : newArrivals
                ).map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group flex flex-col gap-3 rounded-md border border-neutral-800 bg-zinc-950/60 p-3"
                  >
                    <div className="relative overflow-hidden rounded-md bg-neutral-900">
                      {"images" in product && product.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0] as string}
                          alt={product.name}
                          className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-64 w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
                      )}
                      {product.isNew && (
                        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-black">
                          New
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
                        Drop • {product.category}
                      </p>
                      <h2 className="text-sm font-medium tracking-tight text-white">
                        {product.name}
                      </h2>
                      <p className="text-sm text-neutral-100">
                        ${product.price.toFixed(0)}
                      </p>
                    </div>
                  </Link>
                ))}

                {newArrivals.length === 0 && featuredProducts.length === 0 && (
                  <p className="col-span-full text-center text-sm text-neutral-500">
                    No products available yet. Add products in the admin
                    dashboard to populate this drop.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* All products feed */}
          <section
            id="all-drops"
            className="border-b border-neutral-900 bg-black px-4 py-12 md:px-8 md:py-16"
          >
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-light tracking-tight md:text-2xl">
                  All Products
                </h2>
                <Link
                  href="/shop"
                  className="text-[0.75rem] uppercase tracking-[0.18em] text-neutral-300 hover:text-white"
                >
                  View Full Catalog
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[...featuredProducts, ...newArrivals].map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group flex gap-3 rounded-md border border-neutral-800 bg-zinc-950/60 p-3"
                  >
                    <div className="relative h-24 w-24 overflow-hidden rounded-md bg-neutral-900">
                      {"images" in product && product.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0] as string}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">
                          {product.category}
                        </p>
                        <h3 className="text-sm font-medium tracking-tight text-white">
                          {product.name}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between text-[0.75rem] text-neutral-300">
                        <span>${product.price.toFixed(0)}</span>
                        {product.isNew && (
                          <span className="rounded-full border border-emerald-400/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-emerald-300">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}

                {[...featuredProducts, ...newArrivals].length === 0 && (
                  <p className="col-span-full text-center text-sm text-neutral-500">
                    No products available yet.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Editorial / newsletter reused */}
          {editorial && (
            <section
              id="story"
              className="border-b border-neutral-900 bg-black px-4 py-16 md:px-8"
            >
              <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-neutral-300">
                <h2 className="text-2xl font-light tracking-tight text-white md:text-3xl">
                  {editorial.heading}
                </h2>
                {editorial.paragraph1 && <p>{editorial.paragraph1}</p>}
                {editorial.paragraph2 && <p>{editorial.paragraph2}</p>}
              </div>
            </section>
          )}

          {newsletter && (
            <section className="border-b border-neutral-900 bg-black px-4 py-16 md:px-8">
              <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-light tracking-tight md:text-2xl">
                    {newsletter.heading ?? "Stay ahead of the next drop"}
                  </h2>
                  <p className="max-w-md text-sm text-neutral-400">
                    {newsletter.subheading ??
                      "Join the list for early access to new releases and restocks."}
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <NewsletterForm buttonText={newsletter.buttonText} />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-20 border-b border-neutral-900 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="text-xs font-medium tracking-[0.2em] text-white">
            REPREZENTATIVE
          </div>
          <ul className="hidden items-center gap-8 text-[0.7rem] uppercase tracking-[0.18em] text-neutral-300 md:flex">
            <li>
              <Link href="#new" className="hover:text-white hover:opacity-80">
                New Arrivals
              </Link>
            </li>
            <li>
              <Link href="#collection" className="hover:text-white hover:opacity-80">
                Collection
              </Link>
            </li>
            <li>
              <Link href="#story" className="hover:text-white hover:opacity-80">
                Our Story
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white hover:opacity-80">
                Cart (0)
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="flex flex-col">
        {/* Hero Section (Ralph-style) */}
        <section className="relative h-[70vh] w-full overflow-hidden bg-black pt-16 md:h-[70vh]">
          {heroMedia ? (
            heroIsVideo ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={heroMedia} type="video/mp4" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroMedia}
                alt={hero?.headline ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80" />

          <div className="relative z-10 mx-auto flex h-full max-w-6xl items-end px-4 pb-16 md:px-8 md:pb-24">
            <div className="max-w-xl space-y-6">
              <h1 className="text-4xl font-light leading-[1.05] tracking-tight md:text-6xl">
                {hero?.headline ?? "The Heritage Collection"}
              </h1>
              <p className="text-sm font-light tracking-[0.18em] text-neutral-200 md:text-base">
                {hero?.subheadline ??
                  "Timeless design. Uncompromising quality. Wear what you stand for."}
              </p>
              <div className="pt-2">
                <Link
                  href={hero?.ctaLink ?? "/shop"}
                  className="inline-block border-b border-white text-[0.75rem] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-70"
                >
                  {hero?.ctaText ?? "Explore Collection \u2192"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* White line separator */}
        <div className="border-t-4 border-white" />

        {/* Second Hero Block - Uses hero_2 content */}
        <section className="relative h-[70vh] w-full overflow-hidden bg-black md:h-[70vh]">
          {hero2Media ? (
            hero2IsVideo ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={hero2Media} type="video/mp4" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero2Media}
                alt={hero2?.heading ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80" />

          <div className="relative z-10 mx-auto flex h-full max-w-6xl items-end px-4 pb-16 md:px-8 md:pb-24">
            <div className="max-w-xl space-y-6">
              <h1 className="text-4xl font-light leading-[1.05] tracking-tight md:text-6xl">
                {hero2?.heading ?? "Featured Collection"}
              </h1>
              <p className="text-sm font-light tracking-[0.18em] text-neutral-200 md:text-base">
                {hero2?.bodyText ??
                  "Discover our curated selection of premium pieces."}
              </p>
              <div className="pt-2">
                <Link
                  href={hero2?.ctaLink ?? "/shop"}
                  className="inline-block border-b border-white text-[0.75rem] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-70"
                >
                  {hero2?.ctaText ?? "Explore Now \u2192"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* White line separator */}
        <div className="border-t-4 border-white" />

        {/* Two-column promotional blocks (Ralph-style) */}
        <section className="grid min-h-[70vh] grid-cols-1 bg-black md:grid-cols-2">
          {/* Left block - Uses promo_left content */}
          <div className="relative overflow-hidden border-r-4 border-white md:border-r-4">
            {promoLeftMedia ? (
              promoLeftIsVideo ? (
                <video
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={promoLeftMedia} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={promoLeftMedia}
                  alt={promoLeft?.heading ?? ""}
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#1f2933,_#000)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 flex items-end p-8 md:p-12">
              <div className="space-y-3">
                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-neutral-300">
                  REPREZENTATIVE
                </p>
                <h2 className="text-3xl font-light tracking-tight md:text-4xl">
                  {promoLeft?.heading ?? "Outerwear Shop"}
                </h2>
                <p className="max-w-md text-sm text-neutral-200">
                  {promoLeft?.bodyText ??
                    "Thoughtfully designed to embrace the season in style."}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href="/shop?category=men"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Men
                  </Link>
                  <Link
                    href="/shop?category=women"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Women
                  </Link>
                  <Link
                    href="/shop?category=boys"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Boys
                  </Link>
                  <Link
                    href="/shop?category=girls"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Girls
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right block - Uses promo_right content */}
          <div className="relative overflow-hidden">
            {promoRightMedia ? (
              promoRightIsVideo ? (
                <video
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={promoRightMedia} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={promoRightMedia}
                  alt={promoRight?.heading ?? ""}
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#111827,_#000)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 flex items-end p-8 md:p-12">
              <div className="space-y-3">
                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-neutral-300">
                  REPREZENTATIVE
                </p>
                <h2 className="text-3xl font-light tracking-tight md:text-4xl">
                  {promoRight?.heading ?? "Sweater Shop"}
                </h2>
                <p className="max-w-md text-sm text-neutral-200">
                  {promoRight?.bodyText ??
                    "Soft fabrics and iconic silhouettes for everyone on your list."}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href="/shop?category=men"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Men
                  </Link>
                  <Link
                    href="/shop?category=women"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Women
                  </Link>
                  <Link
                    href="/shop?category=kids"
                    className="border-b border-white text-[0.75rem] uppercase tracking-[0.18em] text-white hover:opacity-70"
                  >
                    Kids
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid / New Arrivals */}
        <section
          id="new"
          className="border-t border-neutral-900 bg-black px-4 py-16 md:px-8 md:py-20"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-light tracking-tight md:text-3xl">
                New Arrivals
              </h2>
              <p className="mt-3 max-w-md text-sm font-light text-neutral-400">
                {newArrivals.length > 0
                  ? "A curated selection from the latest collection."
                  : "No products available yet."}
              </p>
            </div>
            <Link
              href="/shop"
              className="text-[0.75rem] uppercase tracking-[0.18em] text-neutral-300 hover:text-white"
            >
              View All Products
            </Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group flex flex-col gap-3"
              >
                <div className="relative overflow-hidden bg-neutral-900">
                  {/* Use first image if available, otherwise a simple gradient placeholder */}
                  {"images" in product && product.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0] as string}
                      alt={product.name}
                      className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-72 w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
                  )}
                  {product.isNew && (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-black">
                      New
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium tracking-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                    {product.category}
                  </p>
                  <p className="text-sm text-neutral-100">
                    ${product.price.toFixed(0)}
                  </p>
                </div>
              </Link>
            ))}

            {newArrivals.length === 0 && (
              <p className="col-span-full text-center text-sm text-neutral-500">
                No products available yet. Add products in the admin dashboard to
                populate this section.
              </p>
            )}
          </div>
        </section>

        {/* Featured products strip */}
        {featuredProducts.length > 0 && (
          <section
            id="featured"
            className="border-t border-neutral-900 bg-black px-4 py-16 md:px-8 md:py-20"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-light tracking-tight md:text-3xl">
                  Featured Picks
                </h2>
                <p className="mt-3 max-w-md text-sm font-light text-neutral-400">
                  Hand-picked pieces highlighted in the admin as featured.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="relative overflow-hidden bg-neutral-900">
                    {"images" in product && product.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0] as string}
                        alt={product.name}
                        className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-72 w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
                    )}
                    {product.isNew && (
                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-black">
                        New
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium tracking-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                      {product.category}
                    </p>
                    <p className="text-sm text-neutral-100">
                      ${product.price.toFixed(0)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Full Width Banner */}
        {banner && (bannerMedia || banner.heading) && (
          <section className="relative h-[60vh] overflow-hidden border-t border-neutral-900 bg-black">
            {bannerMedia ? (
              bannerIsVideo ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={bannerMedia} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerMedia}
                  alt={banner.heading ?? ""}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="px-4 text-center md:px-8">
                {banner.heading && (
                  <h2 className="text-3xl font-light tracking-tight md:text-4xl">
                    {banner.heading}
                  </h2>
                )}
                {banner.ctaText && banner.ctaLink && (
                  <div className="mt-6">
                    <Link
                      href={banner.ctaLink}
                      className="inline-block border-b border-white text-[0.75rem] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-70"
                    >
                      {banner.ctaText}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Three Column Grid */}
        {threeColumns?.columns && threeColumns.columns.length > 0 && (
          <section className="grid border-t border-neutral-900 bg-black md:grid-cols-3">
            {threeColumns.columns.map((column, index) => (
              <Link
                key={column.title ?? `column-${index}`}
                href={column.link ?? "/shop"}
                className="group relative block aspect-[3/4] overflow-hidden border-b border-neutral-900 md:border-b-0 md:border-r last:border-r-0"
              >
                {column.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={column.imageUrl}
                    alt={column.title ?? ""}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#27272a,_#000)]" />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h3 className="text-lg font-light tracking-[0.08em]">
                    {column.title}
                  </h3>
                  <p className="mt-1 text-[0.75rem] uppercase tracking-[0.16em] text-neutral-300">
                    {column.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        )}

        {/* Editorial Section */}
        {editorial && (
          <section
            id="story"
            className="border-t border-neutral-900 bg-black px-4 py-16 md:px-8 md:py-20"
          >
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-light tracking-tight md:text-4xl">
                {editorial.heading}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-neutral-300">
                {editorial.paragraph1}
              </p>
              {editorial.paragraph2 && (
                <p className="mt-4 text-lg leading-relaxed text-neutral-300">
                  {editorial.paragraph2}
                </p>
              )}
              {editorial.ctaText && editorial.ctaLink && (
                <div className="mt-6">
                  <Link
                    href={editorial.ctaLink}
                    className="inline-block border-b border-white text-[0.75rem] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-70"
                  >
                    {editorial.ctaText}
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Newsletter Section */}
        {newsletter && (
          <section className="border-t border-neutral-900 bg-neutral-950 px-4 py-16 md:px-8 md:py-20">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-light uppercase tracking-[0.18em] text-neutral-100">
                {newsletter.heading}
              </h2>
              <p className="mt-3 text-sm text-neutral-400">
                {newsletter.subheading}
              </p>
              <NewsletterForm buttonText={newsletter.buttonText ?? "Subscribe"} />
            </div>
          </section>
        )}

        {/* Footer Section */}
        <footer className="border-t border-neutral-900 bg-black px-4 py-12 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
              <div className="text-sm text-neutral-400">
                {footer?.company && <p className="mb-2">{footer.company}</p>}
                {footer?.copyright && (
                  <p className="text-xs text-neutral-500">
                    {footer.copyright}
                  </p>
                )}
                {!footer?.company && !footer?.copyright && (
                  <p className="text-xs text-neutral-500">
                    © {new Date().getFullYear()} REPREZENTATIVE. All rights reserved.
                  </p>
                )}
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                <p>REPREZENTATIVE</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
