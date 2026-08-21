"use client";

import { useState } from "react";

export type Variant = {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  available: number;
};

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export function VariantManager({
  productId,
  initialVariants,
}: {
  productId: string;
  initialVariants: Variant[];
}) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("Default");
  const [colorHex, setColorHex] = useState("#000000");
  const [stock, setStock] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (sizeValue: string) => {
    const s = sizeValue.trim();
    if (!s) {
      setError("Enter a size.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: s,
          color: color.trim() || "Default",
          colorHex,
          stock: parseInt(stock, 10) || 0,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to add variant.");
        return;
      }
      setVariants((prev) =>
        [...prev, body.variant].sort(
          (a, b) => a.color.localeCompare(b.color) || a.size.localeCompare(b.size),
        ),
      );
      setSize("");
      setStock("0");
    } catch {
      setError("Failed to add variant.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (v: Variant) => {
    if (!window.confirm(`Remove the "${v.color} / ${v.size}" variant?`)) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/variants/${v.id}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to remove variant.");
        return;
      }
      setVariants((prev) => prev.filter((x) => x.id !== v.id));
    } catch {
      setError("Failed to remove variant.");
    }
  };

  return (
    <section className="mt-6 space-y-4 rounded-md border border-neutral-800 bg-zinc-950/60 p-6 text-xs text-white">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
          Sizes &amp; Variants
        </h2>
        <p className="mt-1 text-[0.7rem] text-neutral-500">
          Each size is a variant with its own stock. Sizes you add here appear on
          the storefront and in Inventory. Set stock to 0 to hide a size without
          deleting it.
        </p>
      </div>

      {/* Existing variants */}
      <div className="overflow-hidden rounded-md border border-neutral-800">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-zinc-900/80 text-[0.65rem] uppercase tracking-[0.16em] text-neutral-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Color</th>
              <th className="px-3 py-2 text-left font-medium">Size</th>
              <th className="px-3 py-2 text-right font-medium">Stock</th>
              <th className="px-3 py-2 text-right font-medium">Available</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-t border-neutral-900">
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-neutral-700"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    {v.color}
                  </span>
                </td>
                <td className="px-3 py-2 text-neutral-200">{v.size}</td>
                <td className="px-3 py-2 text-right text-neutral-200">{v.stock}</td>
                <td className="px-3 py-2 text-right text-neutral-200">
                  {v.available}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    className="rounded-md border border-rose-900/60 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-rose-300 hover:bg-rose-950/40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                  No variants yet. Add sizes below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick add common sizes */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.65rem] uppercase tracking-[0.16em] text-neutral-500">
          Quick add:
        </span>
        {COMMON_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => add(s)}
            className="rounded-md border border-neutral-700 px-2.5 py-1 text-[0.65rem] font-semibold text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
          >
            + {s}
          </button>
        ))}
        <span className="text-[0.6rem] text-neutral-600">
          (uses the color &amp; stock set below)
        </span>
      </div>

      {/* Manual add row */}
      <div className="grid gap-3 rounded-md border border-neutral-800 bg-black/40 p-3 md:grid-cols-[1fr,1fr,auto,1fr,auto] md:items-end">
        <div>
          <label className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Size
          </label>
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. M or 32"
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Color name
          </label>
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Default"
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Swatch
          </label>
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-neutral-800 bg-black"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Stock
          </label>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => add(size)}
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-neutral-200 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add size"}
        </button>
      </div>

      {error && <p className="text-[0.7rem] text-red-400">{error}</p>}
    </section>
  );
}
