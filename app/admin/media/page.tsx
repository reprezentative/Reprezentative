"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type ProductOption = { id: string; name: string; slug: string; image: string | null };

type LibImage = {
  path: string;
  url: string;
  name: string;
  size: number;
  updatedAt: string | null;
};

type Progress = { total: number; done: number; failed: number } | null;

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UPLOAD_CONCURRENCY = 4;

export default function MediaLibraryPage() {
  const [images, setImages] = useState<LibImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Progress>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // "Use in product" assignment modal state
  const router = useRouter();
  const [assignImg, setAssignImg] = useState<LibImage | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [assigningTo, setAssigningTo] = useState<string | null>(null);

  const openAssign = async (img: LibImage) => {
    setAssignImg(img);
    setProductSearch("");
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products");
      const body = await res.json().catch(() => ({}));
      setProducts(body.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const assignTo = async (product: ProductOption) => {
    if (!assignImg) return;
    setAssigningTo(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: assignImg.url, mode: "primary" }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setStatus(b.error ?? "Failed to assign image.");
        return;
      }
      setStatus(`Set as the primary image for "${product.name}".`);
      setAssignImg(null);
    } catch {
      setStatus("Failed to assign image.");
    } finally {
      setAssigningTo(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      const body = await res.json().catch(() => ({}));
      setImages(body.images ?? []);
    } catch {
      setStatus("Could not load media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Bulk upload: filters to images, uploads concurrently, tracks progress.
  const uploadAll = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/"),
      );
      const skipped = Array.from(fileList).length - files.length;
      if (files.length === 0) {
        setStatus(skipped > 0 ? "Only image files can be uploaded." : null);
        return;
      }

      setStatus(null);
      let done = 0;
      let failed = 0;
      setProgress({ total: files.length, done: 0, failed: 0 });

      let idx = 0;
      const worker = async () => {
        while (idx < files.length) {
          const file = files[idx++];
          try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/admin/upload", {
              method: "POST",
              body: fd,
            });
            if (res.ok) done++;
            else failed++;
          } catch {
            failed++;
          }
          setProgress({ total: files.length, done, failed });
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker),
      );

      setProgress(null);
      setStatus(
        `Uploaded ${done} image${done === 1 ? "" : "s"}` +
          (failed ? `, ${failed} failed` : "") +
          (skipped ? `, ${skipped} non-image skipped` : "") +
          ".",
      );
      load();
    },
    [load],
  );

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setStatus("Copy failed — select and copy manually.");
    }
  };

  const remove = async (img: LibImage) => {
    if (!window.confirm(`Delete "${img.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: img.path }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setStatus(b.error ?? "Delete failed.");
        return;
      }
      setImages((prev) => prev.filter((i) => i.path !== img.path));
    } catch {
      setStatus("Delete failed.");
    }
  };

  const busy = progress !== null;
  const pct = progress
    ? Math.round(((progress.done + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Media Library</h1>
            <p className="mt-1 text-xs text-neutral-400">
              Upload and manage images. Reuse them for products and content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-md bg-white px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200">
              {busy ? "Uploading…" : "Upload images"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length) uploadAll(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <AdminPageHelp page="media" />
          </div>
        </div>
      </div>

      <section className="px-6 py-6">
        {/* Bulk drag-and-drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy && e.dataTransfer.files?.length) uploadAll(e.dataTransfer.files);
          }}
          className={`mb-6 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-neutral-800 bg-zinc-950/40"
          }`}
        >
          {busy && progress ? (
            <div className="mx-auto max-w-sm">
              <p className="text-xs text-neutral-300">
                Uploading {progress.done + progress.failed} of {progress.total}…
                {progress.failed > 0 && (
                  <span className="text-rose-400"> ({progress.failed} failed)</span>
                )}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              Drag &amp; drop images here to bulk upload, or use{" "}
              <span className="text-neutral-200">Upload images</span>. Up to 5 MB each.
            </p>
          )}
        </div>

        {status && <p className="mb-4 text-[0.75rem] text-neutral-400">{status}</p>}

        {loading ? (
          <p className="py-16 text-center text-xs text-neutral-500">Loading…</p>
        ) : images.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-800 bg-zinc-950/60 py-16 text-center">
            <p className="text-sm text-neutral-300">No images yet</p>
            <p className="mt-1 text-xs text-neutral-500">
              Drag images in above, or click “Upload images”.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[0.7rem] text-neutral-500">
              {images.length} image{images.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {images.map((img) => (
                <div
                  key={img.path}
                  className="overflow-hidden rounded-md border border-neutral-800 bg-zinc-950/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="space-y-2 p-2">
                    <p className="truncate text-[0.7rem] text-neutral-300" title={img.name}>
                      {img.name}
                    </p>
                    <p className="text-[0.65rem] text-neutral-500">
                      {formatSize(img.size)}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAssign(img)}
                      className="w-full rounded-md bg-white px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-black hover:bg-neutral-200"
                    >
                      Use in product
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyUrl(img.url)}
                        className="flex-1 rounded-md border border-neutral-700 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-neutral-200 hover:bg-neutral-900"
                      >
                        {copied === img.url ? "Copied" : "Copy URL"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(img)}
                        className="rounded-md border border-rose-900/60 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-rose-300 hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {assignImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setAssignImg(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-neutral-800 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Use image in a product
              </h3>
              <button
                type="button"
                onClick={() => setAssignImg(null)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assignImg.url}
                alt=""
                className="h-14 w-14 rounded object-cover ring-1 ring-neutral-800"
              />
              <p className="text-[0.7rem] text-neutral-400">
                This becomes the product&apos;s primary image — the one shown on
                the store.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/products/new?image=${encodeURIComponent(assignImg.url)}`,
                )
              }
              className="mb-4 w-full rounded-md border border-emerald-700 bg-emerald-950/30 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-950/60"
            >
              + Create new product with this image
            </button>

            <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-neutral-500">
              …or add it to an existing product
            </p>
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products…"
              className="mb-3 h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
            />
            {loadingProducts ? (
              <p className="py-6 text-center text-xs text-neutral-500">Loading…</p>
            ) : products.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                No products yet — use “Create new product” above.
              </p>
            ) : (
              <div className="space-y-1">
                {products
                  .filter((p) =>
                    p.name.toLowerCase().includes(productSearch.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => assignTo(p)}
                      disabled={assigningTo === p.id}
                      className="flex w-full items-center gap-3 rounded-md border border-neutral-800 px-3 py-2 text-left hover:bg-neutral-900 disabled:opacity-50"
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-neutral-800" />
                      )}
                      <span className="flex-1 text-xs text-neutral-200">
                        {p.name}
                      </span>
                      <span className="text-[0.6rem] uppercase tracking-[0.14em] text-neutral-500">
                        {assigningTo === p.id ? "Saving…" : "Select"}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
