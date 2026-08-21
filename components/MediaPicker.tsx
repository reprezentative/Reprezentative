"use client";

import { useState } from "react";

type LibImage = { path: string; url: string; name: string };

/**
 * Lets an admin attach an image by either uploading a new one OR picking an
 * existing one from the Media Library. Calls onSelect(url) with the public URL.
 * Drop-in wherever an image URL is needed (products, content sections, etc.).
 */
export function MediaPicker({
  onSelect,
  label = "Add image",
}: {
  onSelect: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<LibImage[]>([]);
  const [loading, setLoading] = useState(false);

  const upload = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed");
      onSelect(body.url as string);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const openLibrary = async () => {
    setOpen(true);
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/media");
      const body = await res.json().catch(() => ({}));
      setImages(body.images ?? []);
    } catch {
      setErr("Could not load library");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-md border border-neutral-700 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900">
          {busy ? "Uploading…" : label}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={openLibrary}
          className="rounded-md border border-neutral-700 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
        >
          Library
        </button>
        {err && <span className="text-[0.65rem] text-red-400">{err}</span>}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-neutral-800 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Media Library</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Close
              </button>
            </div>
            {loading ? (
              <p className="py-10 text-center text-xs text-neutral-500">Loading…</p>
            ) : images.length === 0 ? (
              <p className="py-10 text-center text-xs text-neutral-500">
                No images yet. Upload one, or add images from the Media page.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {images.map((img) => (
                  <button
                    key={img.path}
                    type="button"
                    onClick={() => {
                      onSelect(img.url);
                      setOpen(false);
                    }}
                    className="group overflow-hidden rounded-md border border-neutral-800 hover:border-neutral-500"
                    title={img.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
