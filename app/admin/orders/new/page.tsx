"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  sizes: string[];
};

type Line = { slug: string; size: string; qty: number };

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [discount, setDiscount] = useState("");
  const [shipping, setShipping] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  const bySlug = useMemo(
    () => new Map(products.map((p) => [p.slug, p])),
    [products],
  );

  const subtotal = lines.reduce((s, l) => {
    const p = bySlug.get(l.slug);
    return s + (p ? p.price * l.qty : 0);
  }, 0);
  const shipCost =
    shipping !== ""
      ? Number(shipping) || 0
      : subtotal >= 150 || subtotal === 0
        ? 0
        : 8;
  const total = Math.max(0, subtotal - (Number(discount) || 0) + shipCost);

  function addLine() {
    const first = products[0];
    if (!first) return;
    setLines((l) => [
      ...l,
      { slug: first.slug, size: first.sizes[0] ?? "One Size", qty: 1 },
    ]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function submit() {
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid customer email.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || null,
          notes: notes || null,
          isDraft,
          discount: Number(discount) || 0,
          shipping: shipping === "" ? null : Number(shipping) || 0,
          items: lines.map((l) => ({ id: l.slug, size: l.size, qty: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to create order");
        setBusy(false);
        return;
      }
      router.push(`/admin/orders/${data.id}`);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5">
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <Link
            href="/admin/orders"
            className="uppercase tracking-[0.16em] hover:text-white"
          >
            Orders
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="uppercase tracking-[0.16em] text-neutral-200">
            New order
          </span>
        </div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Create manual order
        </h1>
        <p className="mt-1 text-xs text-neutral-400">
          Draft orders do not affect inventory. Uncheck &ldquo;Save as
          draft&rdquo; to place the order and decrement stock.
        </p>
      </div>

      <section className="grid gap-6 px-6 py-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Customer
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Customer email *"
                className="rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                className="rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Items
              </h2>
              <button
                onClick={addLine}
                disabled={products.length === 0}
                className="rounded border border-neutral-700 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
              >
                Add item
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const p = bySlug.get(l.slug);
                return (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 border-b border-neutral-900 pb-2 text-xs"
                  >
                    <select
                      value={l.slug}
                      onChange={(e) => {
                        const np = bySlug.get(e.target.value);
                        updateLine(i, {
                          slug: e.target.value,
                          size: np?.sizes[0] ?? "One Size",
                        });
                      }}
                      className="min-w-[12rem] flex-1 rounded border border-neutral-700 bg-black px-2 py-1.5 text-white"
                    >
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.slug}>
                          {pr.name} (${pr.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <select
                      value={l.size}
                      onChange={(e) => updateLine(i, { size: e.target.value })}
                      className="rounded border border-neutral-700 bg-black px-2 py-1.5 text-white"
                    >
                      {(p?.sizes.length ? p.sizes : ["One Size"]).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) =>
                        updateLine(i, {
                          qty: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-16 rounded border border-neutral-700 bg-black px-2 py-1.5 text-white"
                    />
                    <span className="w-16 text-right text-neutral-300">
                      ${((p?.price ?? 0) * l.qty).toFixed(2)}
                    </span>
                    <button
                      onClick={() =>
                        setLines((ls) => ls.filter((_, idx) => idx !== i))
                      }
                      className="text-neutral-500 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {lines.length === 0 && (
                <p className="text-xs text-neutral-500">
                  No items yet. Click &ldquo;Add item&rdquo;.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes (optional)"
              className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Summary
            </h2>
            <div className="space-y-2 text-neutral-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <label className="flex items-center justify-between gap-2">
                <span>Discount $</span>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-24 rounded border border-neutral-700 bg-black px-2 py-1 text-right text-white"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Shipping $</span>
                <input
                  type="number"
                  step="0.01"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder={shipCost === 0 ? "Free" : shipCost.toFixed(2)}
                  className="w-24 rounded border border-neutral-700 bg-black px-2 py-1 text-right text-white"
                />
              </label>
              <div className="flex justify-between border-t border-neutral-800 pt-2 font-semibold text-white">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
              />
              Save as draft (no inventory change)
            </label>

            {error && <p className="mt-3 text-rose-400">{error}</p>}

            <button
              onClick={submit}
              disabled={busy}
              className="mt-4 w-full rounded bg-white px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-black disabled:opacity-50"
            >
              {busy ? "Creating…" : isDraft ? "Create draft" : "Place order"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
