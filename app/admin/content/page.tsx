"use client";

import { useEffect, useRef, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

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

// Content type for individual homepage sections
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

export default function AdminContentPage() {
  const [hero, setHero] = useState<HeroContent | null>(null);
  const [hero2, setHero2] = useState<SectionContent | null>(null);
  const [promoLeft, setPromoLeft] = useState<SectionContent | null>(null);
  const [promoRight, setPromoRight] = useState<SectionContent | null>(null);
  const [featured, setFeatured] = useState<FeaturedSplitContent | null>(
    null,
  );
  const [banner, setBanner] = useState<BannerContent | null>(null);
  const [threeColumns, setThreeColumns] =
    useState<ThreeColumnsContent | null>(null);
  const [editorial, setEditorial] = useState<EditorialContent | null>(
    null,
  );
  const [newsletter, setNewsletter] =
    useState<NewsletterContent | null>(null);
  const [footer, setFooter] = useState<FooterContent | null>(null);
  const [layout, setLayout] = useState<HomepageLayout>("ralph");

  const [activeTab, setActiveTab] =
    useState<
      | "hero"
      | "hero_2"
      | "promo_left"
      | "promo_right"
      | "featured_split"
      | "full_width_banner"
      | "three_columns"
      | "editorial"
      | "newsletter_section"
      | "footer"
    >("hero");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [
          heroRes,
          hero2Res,
          promoLeftRes,
          promoRightRes,
          featuredRes,
          bannerRes,
          threeColumnsRes,
          editorialRes,
          newsletterRes,
          footerRes,
          generalRes,
        ] = await Promise.all([
          fetch("/api/content/hero"),
          fetch("/api/content/hero_2"),
          fetch("/api/content/promo_left"),
          fetch("/api/content/promo_right"),
          fetch("/api/content/featured_split"),
          fetch("/api/content/full_width_banner"),
          fetch("/api/content/three_columns"),
          fetch("/api/content/editorial"),
          fetch("/api/content/newsletter_section"),
          fetch("/api/content/footer"),
          fetch("/api/admin/settings/general"),
        ]);

        const [
          heroData,
          hero2Data,
          promoLeftData,
          promoRightData,
          featuredData,
          bannerData,
          threeColumnsData,
          editorialData,
          newsletterData,
          footerData,
          generalData,
        ] = await Promise.all([
          heroRes.ok ? heroRes.json() : null,
          hero2Res.ok ? hero2Res.json() : null,
          promoLeftRes.ok ? promoLeftRes.json() : null,
          promoRightRes.ok ? promoRightRes.json() : null,
          featuredRes.ok ? featuredRes.json() : null,
          bannerRes.ok ? bannerRes.json() : null,
          threeColumnsRes.ok ? threeColumnsRes.json() : null,
          editorialRes.ok ? editorialRes.json() : null,
          newsletterRes.ok ? newsletterRes.json() : null,
          footerRes.ok ? footerRes.json() : null,
          generalRes.ok ? generalRes.json() : null,
        ]);

        if (cancelled) return;

        setHero((heroData?.data as HeroContent) ?? {});
        setHero2((hero2Data?.data as SectionContent) ?? {});
        setPromoLeft((promoLeftData?.data as SectionContent) ?? {});
        setPromoRight((promoRightData?.data as SectionContent) ?? {});
        setFeatured(
          (featuredData?.data as FeaturedSplitContent) ?? {},
        );
        setBanner((bannerData?.data as BannerContent) ?? {});
        setThreeColumns(
          (threeColumnsData?.data as ThreeColumnsContent) ?? {},
        );
        setEditorial(
          (editorialData?.data as EditorialContent) ?? {},
        );
        setNewsletter(
          (newsletterData?.data as NewsletterContent) ?? {},
        );
        setFooter((footerData?.data as FooterContent) ?? {});

        const currentLayout = (generalData?.homepageLayout ??
          "ralph") as HomepageLayout;
        setLayout(currentLayout);
      } catch {
        if (!cancelled) {
          setStatus(
            "Failed to load content. Ensure the content API is implemented.",
          );
        }
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const scheduleSave = (key: string, payload: any) => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      setStatus(null);
      try {
        const res = await fetch(`/api/content/${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: payload }),
        });
        if (!res.ok) throw new Error();
        setStatus("Saved");
        // Refresh preview
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.location.reload();
        }
      } catch {
        setStatus("Error saving content.");
      } finally {
        setSaving(false);
      }
    }, 500);
  };

  const handleChange = (field: keyof HeroContent, value: string) => {
    const current = hero ?? {};
    const next = { ...current, [field]: value };
    setHero(next);
    scheduleSave("hero", next);
  };

  const handleFeaturedChange = (
    field: keyof FeaturedSplitContent,
    value: string,
  ) => {
    const current = featured ?? {};
    const next = { ...current, [field]: value };
    setFeatured(next);
    scheduleSave("featured_split", next);
  };

  const handleBannerChange = (field: keyof BannerContent, value: string) => {
    const current = banner ?? {};
    const next = { ...current, [field]: value };
    setBanner(next);
    scheduleSave("full_width_banner", next);
  };

  const handleEditorialChange = (
    field: keyof EditorialContent,
    value: string,
  ) => {
    const current = editorial ?? {};
    const next = { ...current, [field]: value };
    setEditorial(next);
    scheduleSave("editorial", next);
  };

  const handleNewsletterChange = (
    field: keyof NewsletterContent,
    value: string,
  ) => {
    const current = newsletter ?? {};
    const next = { ...current, [field]: value };
    setNewsletter(next);
    scheduleSave("newsletter_section", next);
  };

  const handleFooterChange = (field: keyof FooterContent, value: string) => {
    const current = footer ?? {};
    const next = { ...current, [field]: value };
    setFooter(next);
    scheduleSave("footer", next);
  };

  const handleColumnChange = (
    index: number,
    field: "imageUrl" | "title" | "subtitle" | "link",
    value: string,
  ) => {
    const current = threeColumns ?? {};
    const columns = [...(current.columns ?? [])];
    while (columns.length < 3) columns.push({});
    columns[index] = { ...columns[index], [field]: value };
    const next = { ...current, columns };
    setThreeColumns(next);
    scheduleSave("three_columns", next);
  };

  const handleLayoutChange = async (next: HomepageLayout) => {
    setLayout(next);
    try {
      await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepageLayout: next }),
      });
      // Refresh preview to reflect new layout
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.location.reload();
      }
      setStatus("Saved layout");
    } catch {
      setStatus("Error saving layout");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Content Manager
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Edit homepage sections with a live preview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-neutral-700 bg-black/60 px-3 py-1">
              <span className="text-[0.7rem] uppercase tracking-[0.14em] text-neutral-400">
                Layout
              </span>
              <button
                type="button"
                onClick={() => handleLayoutChange("ralph")}
                className={`rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] ${
                  layout === "ralph"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                Editorial
              </button>
              <button
                type="button"
                onClick={() => handleLayoutChange("drop")}
                className={`rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] ${
                  layout === "drop"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                Drop Feed
              </button>
            </div>
            <AdminPageHelp page="content" />
          </div>
        </div>
      </div>

      <section className="flex min-h-[calc(100vh-4.5rem)] flex-col md:flex-row">
        {/* Left: Live preview */}
        <div className="h-80 border-b border-neutral-900 md:h-auto md:w-1/2 md:border-r">
          <iframe
            ref={iframeRef}
            src="/"
            title="Homepage Preview"
            className="h-full w-full border-0 bg-black"
          />
        </div>

        {/* Right: Form */}
        <div className="flex-1 px-6 py-6">
          <div className="mb-4 flex flex-col gap-3 text-[0.7rem] text-neutral-400 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ["Hero", "hero"],
                ["Hero 2", "hero_2"],
                ["Promo Left", "promo_left"],
                ["Promo Right", "promo_right"],
                ["Featured Split", "featured_split"],
                ["Banner", "full_width_banner"],
                ["Three Columns", "three_columns"],
                ["Editorial", "editorial"],
                ["Newsletter", "newsletter_section"],
                ["Footer", "footer"],
              ] as const).map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      key as typeof activeTab,
                    )
                  }
                  className={`rounded-full px-3 py-1 text-[0.7rem] uppercase tracking-[0.16em] ${
                    activeTab === key
                      ? "bg-white text-black"
                      : "border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p>{saving ? "Saving..." : status}</p>
          </div>

          <div className="space-y-4 rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            {activeTab === "hero" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Hero Media URL (video or image)
                  </label>
                  <input
                    type="text"
                    value={hero?.videoUrl ?? ""}
                    onChange={(e) =>
                      handleChange("videoUrl", e.target.value)
                    }
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Headline
                  </label>
                  <textarea
                    rows={2}
                    value={hero?.headline ?? ""}
                    onChange={(e) =>
                      handleChange("headline", e.target.value)
                    }
                    placeholder="The Heritage Collection"
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Subheadline
                  </label>
                  <textarea
                    rows={3}
                    value={hero?.subheadline ?? ""}
                    onChange={(e) =>
                      handleChange("subheadline", e.target.value)
                    }
                    placeholder="Timeless design. Uncompromising quality. Wear what you stand for."
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={hero?.ctaText ?? ""}
                      onChange={(e) =>
                        handleChange("ctaText", e.target.value)
                      }
                      placeholder="Explore Collection →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={hero?.ctaLink ?? ""}
                      onChange={(e) =>
                        handleChange("ctaLink", e.target.value)
                      }
                      placeholder="/shop"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "hero_2" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Media URL (Video or Image)
                  </label>
                  <input
                    type="text"
                    value={hero2?.videoUrl ?? hero2?.imageUrl ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const current = hero2 ?? {};
                      const isVideo = /(\.mp4($|\?)|\/video\/|video-files)/i.test(value);
                      const next = isVideo
                        ? { ...current, videoUrl: value, imageUrl: undefined }
                        : { ...current, imageUrl: value, videoUrl: undefined };
                      setHero2(next);
                      scheduleSave("hero_2", next);
                    }}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={hero2?.heading ?? ""}
                    onChange={(e) => {
                      const current = hero2 ?? {};
                      const next = { ...current, heading: e.target.value };
                      setHero2(next);
                      scheduleSave("hero_2", next);
                    }}
                    placeholder="Featured Collection"
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Body Text
                  </label>
                  <textarea
                    rows={3}
                    value={hero2?.bodyText ?? ""}
                    onChange={(e) => {
                      const current = hero2 ?? {};
                      const next = { ...current, bodyText: e.target.value };
                      setHero2(next);
                      scheduleSave("hero_2", next);
                    }}
                    placeholder="Discover our curated selection of premium pieces."
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={hero2?.ctaText ?? ""}
                      onChange={(e) => {
                        const current = hero2 ?? {};
                        const next = { ...current, ctaText: e.target.value };
                        setHero2(next);
                        scheduleSave("hero_2", next);
                      }}
                      placeholder="Explore Now →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={hero2?.ctaLink ?? ""}
                      onChange={(e) => {
                        const current = hero2 ?? {};
                        const next = { ...current, ctaLink: e.target.value };
                        setHero2(next);
                        scheduleSave("hero_2", next);
                      }}
                      placeholder="/shop"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "promo_left" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Media URL (Video or Image)
                  </label>
                  <input
                    type="text"
                    value={promoLeft?.videoUrl ?? promoLeft?.imageUrl ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const current = promoLeft ?? {};
                      const isVideo = /(\.mp4($|\?)|\/video\/|video-files)/i.test(value);
                      const next = isVideo
                        ? { ...current, videoUrl: value, imageUrl: undefined }
                        : { ...current, imageUrl: value, videoUrl: undefined };
                      setPromoLeft(next);
                      scheduleSave("promo_left", next);
                    }}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={promoLeft?.heading ?? ""}
                    onChange={(e) => {
                      const current = promoLeft ?? {};
                      const next = { ...current, heading: e.target.value };
                      setPromoLeft(next);
                      scheduleSave("promo_left", next);
                    }}
                    placeholder="Outerwear Shop"
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Body Text
                  </label>
                  <textarea
                    rows={3}
                    value={promoLeft?.bodyText ?? ""}
                    onChange={(e) => {
                      const current = promoLeft ?? {};
                      const next = { ...current, bodyText: e.target.value };
                      setPromoLeft(next);
                      scheduleSave("promo_left", next);
                    }}
                    placeholder="Thoughtfully designed to embrace the season in style."
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={promoLeft?.ctaText ?? ""}
                      onChange={(e) => {
                        const current = promoLeft ?? {};
                        const next = { ...current, ctaText: e.target.value };
                        setPromoLeft(next);
                        scheduleSave("promo_left", next);
                      }}
                      placeholder="Shop Now →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={promoLeft?.ctaLink ?? ""}
                      onChange={(e) => {
                        const current = promoLeft ?? {};
                        const next = { ...current, ctaLink: e.target.value };
                        setPromoLeft(next);
                        scheduleSave("promo_left", next);
                      }}
                      placeholder="/shop"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "promo_right" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Media URL (Video or Image)
                  </label>
                  <input
                    type="text"
                    value={promoRight?.videoUrl ?? promoRight?.imageUrl ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const current = promoRight ?? {};
                      const isVideo = /(\.mp4($|\?)|\/video\/|video-files)/i.test(value);
                      const next = isVideo
                        ? { ...current, videoUrl: value, imageUrl: undefined }
                        : { ...current, imageUrl: value, videoUrl: undefined };
                      setPromoRight(next);
                      scheduleSave("promo_right", next);
                    }}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={promoRight?.heading ?? ""}
                    onChange={(e) => {
                      const current = promoRight ?? {};
                      const next = { ...current, heading: e.target.value };
                      setPromoRight(next);
                      scheduleSave("promo_right", next);
                    }}
                    placeholder="Sweater Shop"
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Body Text
                  </label>
                  <textarea
                    rows={3}
                    value={promoRight?.bodyText ?? ""}
                    onChange={(e) => {
                      const current = promoRight ?? {};
                      const next = { ...current, bodyText: e.target.value };
                      setPromoRight(next);
                      scheduleSave("promo_right", next);
                    }}
                    placeholder="Soft fabrics and iconic silhouettes for everyone on your list."
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={promoRight?.ctaText ?? ""}
                      onChange={(e) => {
                        const current = promoRight ?? {};
                        const next = { ...current, ctaText: e.target.value };
                        setPromoRight(next);
                        scheduleSave("promo_right", next);
                      }}
                      placeholder="Shop Now →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={promoRight?.ctaLink ?? ""}
                      onChange={(e) => {
                        const current = promoRight ?? {};
                        const next = { ...current, ctaLink: e.target.value };
                        setPromoRight(next);
                        scheduleSave("promo_right", next);
                      }}
                      placeholder="/shop"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "featured_split" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Media URL (Video or Image)
                  </label>
                  <input
                    type="text"
                    value={featured?.videoUrl ?? featured?.imageUrl ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const current = featured ?? {};
                      // If it looks like a video URL, save to videoUrl, otherwise imageUrl
                      const isVideo = /(\.mp4($|\?)|\/video\/|video-files)/i.test(value);
                      const next = isVideo
                        ? { ...current, videoUrl: value, imageUrl: undefined }
                        : { ...current, imageUrl: value, videoUrl: undefined };
                      setFeatured(next);
                      scheduleSave("featured_split", next);
                    }}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={featured?.heading ?? ""}
                    onChange={(e) =>
                      handleFeaturedChange("heading", e.target.value)
                    }
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Body Text
                  </label>
                  <textarea
                    rows={3}
                    value={featured?.bodyText ?? ""}
                    onChange={(e) =>
                      handleFeaturedChange("bodyText", e.target.value)
                    }
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={featured?.ctaText ?? ""}
                      onChange={(e) =>
                        handleFeaturedChange("ctaText", e.target.value)
                      }
                      placeholder="Explore Now →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={featured?.ctaLink ?? ""}
                      onChange={(e) =>
                        handleFeaturedChange("ctaLink", e.target.value)
                      }
                      placeholder="/shop"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "full_width_banner" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Media URL (Video or Image)
                  </label>
                  <input
                    type="text"
                    value={banner?.videoUrl ?? banner?.imageUrl ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const current = banner ?? {};
                      // If it looks like a video URL, save to videoUrl, otherwise imageUrl
                      const isVideo = /(\.mp4($|\?)|\/video\/|video-files)/i.test(value);
                      const next = isVideo
                        ? { ...current, videoUrl: value, imageUrl: undefined }
                        : { ...current, imageUrl: value, videoUrl: undefined };
                      setBanner(next);
                      scheduleSave("full_width_banner", next);
                    }}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={banner?.heading ?? ""}
                    onChange={(e) =>
                      handleBannerChange("heading", e.target.value)
                    }
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={banner?.ctaText ?? ""}
                      onChange={(e) =>
                        handleBannerChange("ctaText", e.target.value)
                      }
                      placeholder="Shop Now →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={banner?.ctaLink ?? ""}
                      onChange={(e) =>
                        handleBannerChange("ctaLink", e.target.value)
                      }
                      placeholder="/shop"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "three_columns" && (
              <>
                <p className="text-[0.7rem] text-neutral-500">
                  Three side-by-side promo columns. Leave a column blank to hide
                  it.
                </p>
                {[0, 1, 2].map((i) => {
                  const col = threeColumns?.columns?.[i] ?? {};
                  return (
                    <div
                      key={i}
                      className="space-y-3 rounded-md border border-neutral-800 bg-black/40 p-3"
                    >
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                        Column {i + 1}
                      </p>
                      <div>
                        <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                          Image URL
                        </label>
                        <input
                          type="text"
                          value={col.imageUrl ?? ""}
                          onChange={(e) =>
                            handleColumnChange(i, "imageUrl", e.target.value)
                          }
                          placeholder="https://..."
                          className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                            Title
                          </label>
                          <input
                            type="text"
                            value={col.title ?? ""}
                            onChange={(e) =>
                              handleColumnChange(i, "title", e.target.value)
                            }
                            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                            Subtitle
                          </label>
                          <input
                            type="text"
                            value={col.subtitle ?? ""}
                            onChange={(e) =>
                              handleColumnChange(i, "subtitle", e.target.value)
                            }
                            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                          Link
                        </label>
                        <input
                          type="text"
                          value={col.link ?? ""}
                          onChange={(e) =>
                            handleColumnChange(i, "link", e.target.value)
                          }
                          placeholder="/shop"
                          className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === "editorial" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={editorial?.heading ?? ""}
                    onChange={(e) =>
                      handleEditorialChange(
                        "heading",
                        e.target.value,
                      )
                    }
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Paragraph 1
                  </label>
                  <textarea
                    rows={3}
                    value={editorial?.paragraph1 ?? ""}
                    onChange={(e) =>
                      handleEditorialChange(
                        "paragraph1",
                        e.target.value,
                      )
                    }
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Paragraph 2
                  </label>
                  <textarea
                    rows={3}
                    value={editorial?.paragraph2 ?? ""}
                    onChange={(e) =>
                      handleEditorialChange("paragraph2", e.target.value)
                    }
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={editorial?.ctaText ?? ""}
                      onChange={(e) =>
                        handleEditorialChange("ctaText", e.target.value)
                      }
                      placeholder="Read More →"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={editorial?.ctaLink ?? ""}
                      onChange={(e) =>
                        handleEditorialChange("ctaLink", e.target.value)
                      }
                      placeholder="/about"
                      className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "newsletter_section" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={newsletter?.heading ?? ""}
                    onChange={(e) =>
                      handleNewsletterChange(
                        "heading",
                        e.target.value,
                      )
                    }
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Subheading
                  </label>
                  <textarea
                    rows={2}
                    value={newsletter?.subheading ?? ""}
                    onChange={(e) =>
                      handleNewsletterChange(
                        "subheading",
                        e.target.value,
                      )
                    }
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={newsletter?.buttonText ?? ""}
                    onChange={(e) =>
                      handleNewsletterChange("buttonText", e.target.value)
                    }
                    placeholder="Subscribe"
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
              </>
            )}

            {activeTab === "footer" && (
              <>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Company Description
                  </label>
                  <textarea
                    rows={3}
                    value={footer?.company ?? ""}
                    onChange={(e) =>
                      handleFooterChange(
                        "company",
                        e.target.value,
                      )
                    }
                    className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Copyright Text
                  </label>
                  <input
                    type="text"
                    value={footer?.copyright ?? ""}
                    onChange={(e) =>
                      handleFooterChange(
                        "copyright",
                        e.target.value,
                      )
                    }
                    className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}


